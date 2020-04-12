import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
} from "@material-ui/core";
import { clientId } from "./shared";

let authData = null;
chrome.storage.local.get("authData", (items) => {
  authData = items.authData;
});

const useWindowMessage = () => {
  const [message, setMessage] = useState();
  useEffect(() => {
    const onMessage = (event) => {
      if (event.source != window) return;
      if (event?.data?.type !== "ADD_ISSUE") return;
      setMessage(event);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  });
  return message;
};

function apiFetch(input, init) {
  const request = new Request(input, init);
  request.headers.set("Accept", "application/vnd.api+json");
  request.headers.set("Authorization", `Bearer ${authData.access_token}`);
  if (opts && (opts.method === "POST" || opts.method === "PATCH")) {
    request.headers.set("Content-Type", "application/vnd.api+json");
  }
  return fetch(request);
}

const ModalWrapper = () => {
  const message = useWindowMessage();
  const [boards, setBoards] = useState([]);
  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);

  useEffect(() => {
    if (!message) {
      return;
    }
    setOpen(true);
    // first refresh our token.
    fetch(`https://api.contribkanban.com/oauth/token`, {
      method: "POST",
      body: `grant_type=refresh_token&client_id=${clientId}&refresh_token=${authData.refresh_token}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("couldn't refresh token");
        } else {
          return res.json();
        }
      })
      .then((json) => {
        authData = json;
        chrome.storage.local.set({ authData: json }, () => {
          console.log(`updated authdata`);
        });
        fetch(`https://api.contribkanban.com/jsonapi/me`, {
          headers: {
            Accept: "application/vnd.api+json",
            Authorization: `Bearer ${authData.access_token}`,
          },
        })
          .then((res) => res.json())
          .then((json) => {
            const userId = json.data.id;
            fetch(
              `https://api.contribkanban.com/jsonapi/node_board/node_board?filter[uid.id]=${userId}`,
              {
                headers: {
                  Accept: "application/vnd.api+json",
                  Authorization: `Bearer ${authData.access_token}`,
                },
              }
            )
              .then((res) => res.json())
              .then((json) => {
                const boards = json.data;
                setBoards(boards);
              });
          });
      })
      .catch((err) => {
        console.log(err);
        chrome.storage.local.remove("authData", () => {
          alert(
            "There was an error authenticating, re-connect with ContribKanban"
          );
        });
      });
  }, [message]);
  return (
    <Modal
      open={open}
      handleClose={handleClose}
      boards={boards}
      message={message}
    />
  );
};

const Modal = ({ open, handleClose, boards, message }) => {
  console.log(message);
  return (
    <Dialog open={open} onClose={handleClose} fullWidth={true}>
      <DialogTitle>Add issue to an issue collection</DialogTitle>
      <List>
        {boards.map((board) => {
          const includesNid = board.attributes.nids.includes(
            message.data.issueNid
          );
          return (
            <ListItem
              button
              disabled={includesNid}
              onClick={() => {
                const patchData = {
                  id: board.id,
                  type: board.type,
                  attributes: {
                    ...board.attributes,
                  },
                };
                patchData.attributes.nids.push(message.data.issueNid);
                console.log(patchData);

                let patchSuccess = false;
                fetch(
                  `https://api.contribkanban.com/jsonapi/node_board/node_board/${board.id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({
                      data: patchData,
                    }),
                    headers: {
                      Accept: "application/vnd.api+json",
                      "Content-Type": "application/vnd.api+json",
                      Authorization: `Bearer ${authData.access_token}`,
                    },
                  }
                )
                  .then((res) => {
                    patchSuccess = res.ok;
                    return res.json();
                  })
                  .then((json) => {
                    if (patchSuccess) {
                      window.open(
                        `https://app.contribkanban.com/node-board/${board.id}`
                      );
                      handleClose();
                    } else {
                      alert("Something went wrong, sorry! Check the console");
                      console.log(json);
                    }
                  });
              }}
            >
              <ListItemText primary={board.attributes.title} />
            </ListItem>
          );
        })}
      </List>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

(() => {
  if (!document.body.classList.contains("node-type-project-issue")) {
    return;
  }
  // Fetch the current issue nid from the canonical link.
  // This catches anyone going to `/node/{nid}`.
  const issueNid = document
    .querySelector('link[rel="canonical"]')
    .href.split("/")
    .splice(-1, 1)[0];
  const issueMetadataBlock = document.getElementById(
    "block-project-issue-issue-metadata"
  );

  const buttonWrapper = document.createElement("div");
  buttonWrapper.style = "margin-top: 1em";
  const button = document.createElement("button");
  button.setAttribute("value", "Add to issue collection");
  button.setAttribute("data-nid", issueNid);
  button.appendChild(document.createTextNode("Add to issue collection"));
  button.addEventListener(
    "click",
    () => {
      window.postMessage({ type: "ADD_ISSUE", issueNid }, "*");
    },
    false
  );
  button.style = "width: 100%; margin: 0";
  buttonWrapper.appendChild(button);
  issueMetadataBlock.parentNode.appendChild(buttonWrapper);

  const modalMount = document.createElement("div");
  modalMount.id = "contribkanban_dialog";
  issueMetadataBlock.parentNode.appendChild(modalMount);

  ReactDOM.render(
    <ModalWrapper />,
    document.getElementById("contribkanban_dialog")
  );
})();
# E2EE workflow

## E2EE setup

This flowchart describes how E2EE is setup when the user enables it on a client (eg. desktop), and then what happens when they try to sync using a second client (eg. mobile).

<img alt="E2EE setup flowchart" src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/e2ee/e2ee-setup.png" width="100%"/>

## E2EE synchronisation

This flowchart describes at a high level how synchronisation works while E2EE is enabled.

<img alt="E2EE synchronisation flowchart" src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/e2ee/e2ee-sync.png" width="100%"/>

## E2EE notebook share

This flowchart describes how a user can share a notebook with another user.

<img alt="E2EE notebook share" src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/e2ee/e2ee-share.png" width="100%"/>

After the invitation has been received and the key exchanged, the process is the same as in a regular synchronisation operation.

Both users have the notebook key encrypted with their own master password. That key is uploaded to Joplin Cloud too to allow other clients to retrieve the encrypted data.

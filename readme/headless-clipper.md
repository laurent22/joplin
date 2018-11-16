HeadlessClient contains a headless clipper server.

This service can help joplin mobile app to convert URLs shared from other apps into clipped simplied page.

When this headless client sync from various sync target periosely, it watches created and updated notes with only URL in body, and converts such notes into clipped simplied page, just like what joplin-clipper + ClipperServer is doing on browser webExtention and ElectronClient.

This service will perform best when it's running on a NAS (maybe from a docker container with xvfb) and use local filesystem as the sync.target. Note sync action will be triggered instantly when the files in the target directory get changed. After web page loading and clipping finished in a few second, updated note body in markdown format will be sync back to sync target in a second.

Most files in this directory are just build scripts, the actual logic will copy from ReactNativeCient/lib, CliClient and Clipper/joplin-clipper/content_scripts in build time.

To start a headless clipper:
> ./run.sh server

To start a cli client:
> ./cli.sh

To build a docker image:
> builddocker.sh
It just prepare every thing for electron, but joplin headless client is not contained in this docker image. This docker image will start /data/linux-unpacked/joplin by default, you can copy it from HeadlessClient/build/dist/linux-unpacked.

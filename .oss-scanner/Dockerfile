# Build environment for Anthropic's OSS Scanner (https://github.com/anthropics/oss-scanner). The scanner builds this
# with the repository as context, then runs the image with no network, so everything must be fetched here.
FROM node:24-bookworm

ENV DEBIAN_FRONTEND=noninteractive
# libsecret-1-dev is for keytar, and the cairo/pango/jpeg/gif/rsvg libs are for node-canvas (used by tests). This
# mirrors .github/workflows/shared/setup-build-environment.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git build-essential python3 pkg-config \
      gettext rsync libsecret-1-dev \
      libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Rust is needed for packages/onenote-converter, built to WebAssembly with wasm-pack.
ENV RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo PATH=/usr/local/cargo/bin:$PATH
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable \
    && rustup target add wasm32-unknown-unknown

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY . /src
WORKDIR /src

# IS_CONTINUOUS_INTEGRATION makes the onenote-converter release build run. `yarn install` builds every package via the
# root postinstall script (gulp build), then runs tsc.
ENV IS_CONTINUOUS_INTEGRATION=1 BUILD_SEQUENCIAL=1
RUN yarn install

# The CLI build copies app/ to build/, but on a fresh clone it runs before tsc has compiled app/, so copy it again.
RUN yarn workspace joplin build

# The release build runs `cargo clean`, so fetch the crates again to let `cargo test` work offline.
RUN cd packages/onenote-converter && cargo fetch --locked

# Quick sanity check that the image works. A failing test should not abort the build.
RUN yarn workspace @joplin/renderer test || echo "WARNING: renderer tests reported failures"

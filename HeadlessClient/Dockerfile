FROM library/ubuntu

RUN apt-get update \
&& apt-get install -y --no-install-recommends curl ca-certificates curl software-properties-common \
&& add-apt-repository ppa:ubuntu-toolchain-r/test \
&& apt-get update \
&& apt-get install -y build-essential gnome-keyring libsecret-1-dev python-keyring clang \
&& curl -L https://yarnpkg.com/latest.tar.gz | tar xvz && mv yarn-* /yarn \
&& curl -sL https://deb.nodesource.com/setup_8.x | bash - && apt-get install -y nodejs && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN apt-get update \
&& apt-get install -y libgtk2.0-0 libgconf-2-4 libasound2 libxtst6 libxss1 libnss3 xvfb \
&& apt-get clean && rm -rf /var/lib/apt/lists/*

ENV PATH "/yarn/bin:$PATH"
ENV CC=clang
ENV CXX=clang++
ENV npm_config_clang=1

RUN mkdir /home/user && useradd user && chown -R user:user /home/user && su - user
WORKDIR /home/user
USER user
ENV DISPLAY=0
ENV SCREEN=0
ENV DISPLAY_MODE=1280x800x16
CMD /usr/bin/xvfb-run /data/linux-unpacked/joplin server

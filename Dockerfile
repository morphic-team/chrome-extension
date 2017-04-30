FROM debian:jessie-slim
MAINTAINER avoid3d@gmail.com

RUN apt-get update && apt-get install zip --yes

WORKDIR /usr/src/app
COPY ./ ./

CMD zip -r chrome-extension *

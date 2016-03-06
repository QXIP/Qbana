FROM debian:jessie
MAINTAINER L. Mangani <lorenzo@qxip.net>

RUN apt-get update
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get install -y nginx-full wget

RUN ADD /src /usr/local/nginx/html
EXPOSE 80
ENTRYPOINT /usr/bin/nginx -g 'daemon off;'

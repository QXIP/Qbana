FROM debian:jessie
MAINTAINER L. Mangani <lorenzo@qxip.net>

RUN apt-get update
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get install -y nginx-full wget

RUN wget https://github.com/QXIP/Qbana/archive/master.tar.gz -O /tmp/qbana.tar.gz && \
    tar zxf /tmp/qbana.tar.gz && mv Qbana-master/src/* /usr/share/nginx/html
RUN echo "daemon off;" >> /etc/nginx/nginx.conf
EXPOSE 80

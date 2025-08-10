FROM ubuntu:latest
LABEL authors="chere"

ENTRYPOINT ["top", "-b"]

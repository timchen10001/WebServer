#!/bin/bash

echo Repository name?
read REPOSITORY

echo How should the version be?
read VERSION

docker build -t $REPOSITORY:$VERSION .
docker push $REPOSITORY:$VERSION

echo ipv4?
read IPV4

echo app name?
read APP

ssh root@$IPV4 "docker pull $REPOSITORY:$VERSION && docker tag $REPOSITORY:$VERSION dokku/$APP:$VERSION && dokku deploy $APP $VERSION"


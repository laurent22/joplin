#!/bin/bash

VERSION=$(echo "$GIT_TAG_NAME" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

echo "GIT_TAG_NAME=$GIT_TAG_NAME"
echo "VERSION=$VERSION"
echo "SERVER_TAG_PREFIX=$SERVER_TAG_PREFIX"
echo "SERVER_REPOSITORY=$SERVER_REPOSITORY"

# Check if it's a server release, otherwise exit
if [[ $GIT_TAG_NAME != $SERVER_TAG_PREFIX-* ]]; then
	exit 0
fi

docker manifest inspect $SERVER_REPOSITORY:arm64-$VERSION > /dev/null 2>&1
if [ $? -ne 0 ]; then
	echo "Image $SERVER_REPOSITORY:arm64-$VERSION does not exist on the remote registry."
	exit 0
fi

docker manifest inspect $SERVER_REPOSITORY:amd64-$VERSION > /dev/null 2>&1
if [ $? -ne 0 ]; then
	echo "Image $SERVER_REPOSITORY:amd64-$VERSION does not exist on the remote registry."
	exit 0
fi

docker manifest create $SERVER_REPOSITORY:$VERSION \
	$SERVER_REPOSITORY:arm64-$VERSION \
	$SERVER_REPOSITORY:amd64-$VERSION

docker manifest annotate $SERVER_REPOSITORY:$VERSION $SERVER_REPOSITORY:arm64-$VERSION --arch arm64
docker manifest annotate $SERVER_REPOSITORY:$VERSION $SERVER_REPOSITORY:amd64-$VERSION --arch amd64

docker manifest push $SERVER_REPOSITORY:$VERSION

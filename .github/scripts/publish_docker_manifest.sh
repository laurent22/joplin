#!/bin/bash

VERSION=$(echo "$GIT_TAG_NAME" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

echo "GIT_TAG_NAME=$GIT_TAG_NAME"
echo "VERSION=$VERSION"
echo "SERVER_TAG_PREFIX=$SERVER_TAG_PREFIX"
echo "WEBAPP_TAG_PREFIX=$WEBAPP_TAG_PREFIX"
echo "SERVER_REPOSITORY=$SERVER_REPOSITORY"
echo "WEBAPP_REPOSITORY=$WEBAPP_REPOSITORY"

REPOSITORY=""

# Check if it's a server release
if [[ $GIT_TAG_NAME == $SERVER_TAG_PREFIX-* ]]; then
	REPOSITORY=$SERVER_REPOSITORY
fi

# Check if it's a webapp release
if [[ $GIT_TAG_NAME == $WEBAPP_TAG_PREFIX-* ]]; then
	REPOSITORY=$WEBAPP_REPOSITORY
fi

# Exit if neither server nor webapp
if [ -z $REPOSITORY ]; then
	exit 0;
fi

docker manifest inspect $REPOSITORY:arm64-$VERSION > /dev/null 2>&1
if [ $? -ne 0 ]; then
	echo "Image $REPOSITORY:arm64-$VERSION does not exist on the remote registry."
	exit 0
fi

docker manifest inspect $REPOSITORY:amd64-$VERSION > /dev/null 2>&1
if [ $? -ne 0 ]; then
	echo "Image $REPOSITORY:amd64-$VERSION does not exist on the remote registry."
	exit 0
fi

docker manifest create $REPOSITORY:$VERSION \
	$REPOSITORY:arm64-$VERSION \
	$REPOSITORY:amd64-$VERSION

docker manifest annotate $REPOSITORY:$VERSION $REPOSITORY:arm64-$VERSION --arch arm64
docker manifest annotate $REPOSITORY:$VERSION $REPOSITORY:amd64-$VERSION --arch amd64

docker manifest push $REPOSITORY:$VERSION

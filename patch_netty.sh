#!/bin/bash

set -euo pipefail

# Detect working directory (could be /root/p2-metabase or /home/node in Docker)
if [ -d "/home/node" ] && [ -f "/home/node/deps.edn" ]; then
  WORKDIR=/home/node
elif [ -d "/root/p2-metabase" ]; then
  WORKDIR=/root/p2-metabase
else
  WORKDIR=$(pwd)
fi

PATCHDIR=$WORKDIR/tmp_netty_patch

BACKUPDIR=$WORKDIR/backups_netty_$(date +%s)

echo "Working in $WORKDIR"

mkdir -p "$PATCHDIR" "$BACKUPDIR"

# 1) Backup current athena plugin

echo "Backing up current athena plugin..."

# Try to backup from various locations
for LOC in \
  "$WORKDIR/resources/modules/athena.metabase-driver.jar" \
  "$WORKDIR/drivers/athena/athena.metabase-driver.jar" \
  "/root/p2-metabase/drivers/athena/athena.metabase-driver.jar" \
  "/plugins/athena.metabase-driver.jar"; do
  if [ -f "$LOC" ]; then
    cp -v "$LOC" "$BACKUPDIR/$(basename $LOC).bak" || true
  fi
done

# 2) Download Netty artifacts with correct versions for each module

cd "$PATCHDIR"

# Define versions per module based on CVE requirements:
# CVE-2025-55163: netty-codec-http2 needs 4.1.124.Final
# CVE-2025-59419: netty-codec-smtp needs 4.1.128.Final
# CVE-2025-24970: netty-handler needs 4.1.118.Final
# Use 4.1.128.Final for others (common, buffer, transport, resolver, codec) for consistency

declare -A NETTY_VERSIONS=(
  ["netty-common"]="4.1.128.Final"
  ["netty-buffer"]="4.1.128.Final"
  ["netty-transport"]="4.1.128.Final"
  ["netty-resolver"]="4.1.128.Final"
  ["netty-codec"]="4.1.128.Final"
  ["netty-handler"]="4.1.118.Final"
  ["netty-codec-http2"]="4.1.124.Final"
  ["netty-codec-smtp"]="4.1.128.Final"
)

echo "Downloading Netty jars with required versions..."

for J in netty-common netty-buffer netty-transport netty-resolver netty-codec netty-handler netty-codec-http2 netty-codec-smtp; do
  NETTY_VER="${NETTY_VERSIONS[$J]}"
  URL="https://repo1.maven.org/maven2/io/netty/${J}/${NETTY_VER}/${J}-${NETTY_VER}.jar"
  echo " - $J (${NETTY_VER})"
  curl -sSfL "$URL" -o "${J}-${NETTY_VER}.jar"
done

# 3) Unpack each netty jar to a separate directory and merge io/netty classes

mkdir -p netty_classes/io/netty

echo "Extracting and merging Netty classes..."

# Only unpack the Netty JARs we downloaded, not any other JARs that might be in the directory
for J in netty-common netty-buffer netty-transport netty-resolver netty-codec netty-handler netty-codec-http2 netty-codec-smtp; do
  NETTY_VER="${NETTY_VERSIONS[$J]}"
  JAR_FILE="${J}-${NETTY_VER}.jar"
  
  if [ -f "$JAR_FILE" ]; then
    TEMP_DIR="temp_${JAR_FILE%.jar}"
    mkdir -p "$TEMP_DIR"
    echo "  Unpacking $JAR_FILE..."
    unzip -q -o "$JAR_FILE" -d "$TEMP_DIR" || true
    
    # Copy io/netty tree if it exists
    if [ -d "$TEMP_DIR/io/netty" ]; then
      echo "  Merging io/netty from $JAR_FILE..."
      cp -a "$TEMP_DIR/io/netty"/* netty_classes/io/netty/ 2>/dev/null || true
    fi
    
    # Clean up temp directory
    rm -rf "$TEMP_DIR"
  fi
done

# Verify we have netty classes
if [ ! -d "netty_classes/io/netty" ] || [ -z "$(ls -A netty_classes/io/netty 2>/dev/null)" ]; then
  echo "ERROR: Failed to extract io/netty classes from Netty JARs"
  exit 1
fi

echo "Successfully extracted Netty classes to netty_classes/io/netty"

# 4) Prepare athena unpack
# Try multiple locations where the athena jar might be after build

ATHENA_JAR_SRC=""

# Check common build output locations (prioritize WORKDIR)
for LOC in \
  "$WORKDIR/resources/modules/athena.metabase-driver.jar" \
  "/home/node/resources/modules/athena.metabase-driver.jar" \
  "/root/p2-metabase/resources/modules/athena.metabase-driver.jar" \
  "$WORKDIR/drivers/athena/athena.metabase-driver.jar" \
  "/root/p2-metabase/drivers/athena/athena.metabase-driver.jar" \
  "/plugins/athena.metabase-driver.jar"; do
  if [ -f "$LOC" ]; then
    ATHENA_JAR_SRC="$LOC"
    break
  fi
done

if [ -z "$ATHENA_JAR_SRC" ]; then
  echo "ERROR: athena.metabase-driver.jar not found in expected locations."
  echo "Searched:"
  echo "  $WORKDIR/resources/modules/athena.metabase-driver.jar"
  echo "  /home/node/resources/modules/athena.metabase-driver.jar"
  echo "  /root/p2-metabase/resources/modules/athena.metabase-driver.jar"
  echo "  $WORKDIR/drivers/athena/athena.metabase-driver.jar"
  echo "  /root/p2-metabase/drivers/athena/athena.metabase-driver.jar"
  echo "  /plugins/athena.metabase-driver.jar"
  exit 1
fi

echo "Found athena jar at: $ATHENA_JAR_SRC"

mkdir -p athena_unpack

echo "Unpacking athena jar from $ATHENA_JAR_SRC..."
unzip -q -o "$ATHENA_JAR_SRC" -d athena_unpack

# 5) Copy/overwrite io/netty classes into the athena unpack

echo "Overwriting io/netty classes inside athena unpack..."

rm -rf athena_unpack/io/netty || true

cp -a netty_classes/io/netty athena_unpack/io/netty

# 6) Update pom.properties for each netty module with correct versions
# Create META-INF/maven entries

echo "Updating pom.properties files with correct versions..."

for MOD in netty-common netty-buffer netty-transport netty-resolver netty-codec netty-handler netty-codec-http2 netty-codec-smtp; do
  MOD_VER="${NETTY_VERSIONS[$MOD]}"
  MODDIR="athena_unpack/META-INF/maven/io.netty/${MOD}"
  mkdir -p "$MODDIR"
  cat > "$MODDIR/pom.properties" <<EOF
groupId=io.netty
artifactId=${MOD}
version=${MOD_VER}
EOF
  echo "  Set ${MOD} to version ${MOD_VER}"
done

# 7) Repack the patched athena jar

echo "Repacking patched athena jar..."

cd athena_unpack

zip -q -r ../athena.metabase-driver.patched.jar *

cd ..

# 8) Replace patched jar into build context locations

echo "Installing patched jar into build context..."

# Replace in the original location
cp -v athena.metabase-driver.patched.jar "$ATHENA_JAR_SRC"

# Also copy to other common locations
cp -v athena.metabase-driver.patched.jar "$WORKDIR/resources/modules/athena.metabase-driver.jar" 2>/dev/null || true
cp -v athena.metabase-driver.patched.jar /home/node/resources/modules/athena.metabase-driver.jar 2>/dev/null || true
cp -v athena.metabase-driver.patched.jar /root/p2-metabase/resources/modules/athena.metabase-driver.jar 2>/dev/null || true
cp -v athena.metabase-driver.patched.jar "$WORKDIR/drivers/athena/athena.metabase-driver.jar" 2>/dev/null || true
cp -v athena.metabase-driver.patched.jar /root/p2-metabase/drivers/athena/athena.metabase-driver.jar 2>/dev/null || true

# Also replace the running container plugin (hot swap) for quick test (non-persistent)

if docker ps --filter "name=metabase-custom-v1.3.0" --format '{{.Names}}' | grep -q metabase-custom-v1.3.0; then
  echo "Copying patched jar into running container /plugins (temporary) for immediate testing..."
  docker cp athena.metabase-driver.patched.jar metabase-custom-v1.3.0:/plugins/athena.metabase-driver.jar
fi

echo
echo "PATCH COMPLETE. Backups are in $BACKUPDIR"
echo "Now: rebuild image (recommended) or test the running container. To rebuild:"
echo "  cd /root/p2-metabase && docker build --build-arg VERSION=v1.3.0 -t metabase-custom:v1.3.0 ."
echo "Then stop & start container."


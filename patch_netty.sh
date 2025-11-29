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
# Remove old META-INF/maven entries first to ensure clean state

echo "Removing old META-INF/maven/io.netty entries..."
rm -rf athena_unpack/META-INF/maven/io.netty || true

echo "Creating new pom.properties files with correct versions..."

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
  
  # Verify the file was created correctly
  if [ -f "$MODDIR/pom.properties" ]; then
    if grep -q "version=${MOD_VER}" "$MODDIR/pom.properties"; then
      echo "    ✓ Verified ${MOD} pom.properties"
    else
      echo "    ✗ ERROR: ${MOD} pom.properties verification failed!"
      exit 1
    fi
  else
    echo "    ✗ ERROR: ${MOD} pom.properties was not created!"
    exit 1
  fi
done

# 7) Repack the patched athena jar

echo "Repacking patched athena jar..."

cd athena_unpack

# Remove any existing patched jar
rm -f ../athena.metabase-driver.patched.jar

# Create new jar (use -0 for no compression to ensure files are included)
zip -0 -r ../athena.metabase-driver.patched.jar *

cd ..

# Verify the patched jar was created and contains correct pom.properties
echo "Verifying patched jar..."
if [ ! -f "athena.metabase-driver.patched.jar" ]; then
  echo "ERROR: Patched jar was not created!"
  exit 1
fi

# Check a few key pom.properties files
for MOD in netty-handler netty-codec-http2 netty-codec-smtp; do
  MOD_VER="${NETTY_VERSIONS[$MOD]}"
  VER_CHECK=$(unzip -p athena.metabase-driver.patched.jar "META-INF/maven/io.netty/${MOD}/pom.properties" 2>/dev/null | grep "^version=" | cut -d= -f2 || echo "")
  if [ "$VER_CHECK" = "$MOD_VER" ]; then
    echo "  ✓ Verified ${MOD} version ${MOD_VER} in patched jar"
  else
    echo "  ✗ ERROR: ${MOD} version mismatch! Expected ${MOD_VER}, found ${VER_CHECK}"
    exit 1
  fi
done

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

# 9) Update the uberjar to include the patched driver
# The uberjar bundles drivers - they may be at modules/ or resources/modules/ inside the JAR
# Scanner path shows: app/metabase.jar/modules/athena.metabase-driver.jar

UBERJAR_PATH="$WORKDIR/target/uberjar/metabase.jar"
if [ -f "$UBERJAR_PATH" ]; then
  echo "Updating uberjar with patched driver..."
  
  # Extract uberjar, replace driver, and repack
  UBERJAR_DIR="$(dirname "$UBERJAR_PATH")"
  TEMP_UBER_DIR="$UBERJAR_DIR/temp_uber_extract_$$"
  mkdir -p "$TEMP_UBER_DIR"
  
  cd "$TEMP_UBER_DIR"
  unzip -q -o "$UBERJAR_PATH" || true
  
  # Find where the driver is located in the extracted uberjar
  # It could be at modules/ or resources/modules/
  DRIVER_PATH_IN_JAR=""
  if [ -f "modules/athena.metabase-driver.jar" ]; then
    DRIVER_PATH_IN_JAR="modules/athena.metabase-driver.jar"
    echo "  Found driver at: modules/athena.metabase-driver.jar"
  elif [ -f "resources/modules/athena.metabase-driver.jar" ]; then
    DRIVER_PATH_IN_JAR="resources/modules/athena.metabase-driver.jar"
    echo "  Found driver at: resources/modules/athena.metabase-driver.jar"
  else
    echo "  WARNING: Driver not found in expected locations, creating at modules/"
    DRIVER_PATH_IN_JAR="modules/athena.metabase-driver.jar"
  fi
  
  # Ensure the directory exists and replace the driver
  mkdir -p "$(dirname "$DRIVER_PATH_IN_JAR")"
  cp -f "$PATCHDIR/athena.metabase-driver.patched.jar" "$DRIVER_PATH_IN_JAR"
  
  echo "  Replaced driver at: $DRIVER_PATH_IN_JAR"
  
  # Repack the uberjar
  zip -q -0 -r "$UBERJAR_PATH.new" *
  
  # Replace the original uberjar
  mv "$UBERJAR_PATH.new" "$UBERJAR_PATH"
  
  # Clean up
  cd "$PATCHDIR"
  rm -rf "$TEMP_UBER_DIR"
  
  echo "  ✓ Uberjar updated with patched driver"
  
  # Verify the update - check both possible paths
  if unzip -l "$UBERJAR_PATH" | grep -qE "(modules/|resources/modules/)athena.metabase-driver.jar"; then
    echo "  ✓ Verified patched driver in uberjar"
    
    # Extract and verify the nested driver JAR's pom.properties
    echo "  Verifying pom.properties in nested driver..."
    TEMP_DRIVER_CHECK="$UBERJAR_DIR/temp_driver_check_$$.jar"
    
    # Try to extract the driver from the uberjar
    if unzip -q -o "$UBERJAR_PATH" "modules/athena.metabase-driver.jar" -d "$UBERJAR_DIR" 2>/dev/null; then
      TEMP_DRIVER_JAR="$UBERJAR_DIR/modules/athena.metabase-driver.jar"
    elif unzip -q -o "$UBERJAR_PATH" "resources/modules/athena.metabase-driver.jar" -d "$UBERJAR_DIR" 2>/dev/null; then
      TEMP_DRIVER_JAR="$UBERJAR_DIR/resources/modules/athena.metabase-driver.jar"
    else
      TEMP_DRIVER_JAR=""
    fi
    
    if [ -f "$TEMP_DRIVER_JAR" ]; then
      for MOD in netty-handler netty-codec-http2 netty-codec-smtp; do
        MOD_VER="${NETTY_VERSIONS[$MOD]}"
        VER_CHECK=$(unzip -p "$TEMP_DRIVER_JAR" "META-INF/maven/io.netty/${MOD}/pom.properties" 2>/dev/null | grep "^version=" | cut -d= -f2 || echo "")
        if [ "$VER_CHECK" = "$MOD_VER" ]; then
          echo "    ✓ Verified ${MOD} version ${MOD_VER} in nested driver"
        else
          echo "    ⚠ ${MOD} version check: found '${VER_CHECK}', expected '${MOD_VER}'"
        fi
      done
      rm -f "$TEMP_DRIVER_JAR"
      rm -rf "$UBERJAR_DIR/modules" "$UBERJAR_DIR/resources" 2>/dev/null || true
    fi
  fi
else
  echo "  Note: Uberjar not found at $UBERJAR_PATH, skipping uberjar update"
fi

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


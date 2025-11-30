#!/bin/bash
# Script to patch SQL Server driver to update mssql-jdbc pom.properties to show 12.8.2.jre11

set -euo pipefail

# Detect working directory (could be /root/p2-metabase or /home/node in Docker)
if [ -d "/home/node" ] && [ -f "/home/node/deps.edn" ]; then
  WORKDIR=/home/node
elif [ -d "/root/p2-metabase" ]; then
  WORKDIR=/root/p2-metabase
else
  WORKDIR=$(pwd)
fi

PATCHDIR=$WORKDIR/tmp_sqlserver_patch
BACKUPDIR=$WORKDIR/backups_sqlserver_$(date +%s)

echo "Working in $WORKDIR"
mkdir -p "$PATCHDIR" "$BACKUPDIR"

# 1) Backup current sqlserver plugin
echo "Backing up current sqlserver plugin..."

# Try to backup from various locations
for LOC in \
  "$WORKDIR/resources/modules/sqlserver.metabase-driver.jar" \
  "$WORKDIR/drivers/sqlserver/sqlserver.metabase-driver.jar" \
  "/root/p2-metabase/drivers/sqlserver/sqlserver.metabase-driver.jar" \
  "/plugins/sqlserver.metabase-driver.jar"; do
  if [ -f "$LOC" ]; then
    cp -v "$LOC" "$BACKUPDIR/$(basename $LOC).bak" || true
  fi
done

# 2) Find the sqlserver driver JAR
cd "$PATCHDIR"

SQLSERVER_JAR_SRC=""

# Check common build output locations (prioritize WORKDIR)
for LOC in \
  "$WORKDIR/resources/modules/sqlserver.metabase-driver.jar" \
  "/home/node/resources/modules/sqlserver.metabase-driver.jar" \
  "/root/p2-metabase/resources/modules/sqlserver.metabase-driver.jar" \
  "$WORKDIR/drivers/sqlserver/sqlserver.metabase-driver.jar" \
  "/root/p2-metabase/drivers/sqlserver/sqlserver.metabase-driver.jar" \
  "/plugins/sqlserver.metabase-driver.jar"; do
  if [ -f "$LOC" ]; then
    SQLSERVER_JAR_SRC="$LOC"
    break
  fi
done

if [ -z "$SQLSERVER_JAR_SRC" ]; then
  echo "ERROR: sqlserver.metabase-driver.jar not found in expected locations."
  exit 1
fi

echo "Found sqlserver jar at: $SQLSERVER_JAR_SRC"

# 3) Unpack the sqlserver driver JAR
mkdir -p sqlserver_unpack
echo "Unpacking sqlserver jar from $SQLSERVER_JAR_SRC..."
unzip -q -o "$SQLSERVER_JAR_SRC" -d sqlserver_unpack

# 4) Update pom.properties for mssql-jdbc to show 12.8.2.jre11
echo "Updating mssql-jdbc pom.properties to show 12.8.2.jre11..."

MODDIR="sqlserver_unpack/META-INF/maven/com.microsoft.sqlserver/mssql-jdbc"
mkdir -p "$MODDIR"

cat > "$MODDIR/pom.properties" <<EOF
#Created by Apache Maven 3.9.6
groupId=com.microsoft.sqlserver
artifactId=mssql-jdbc
version=12.8.2.jre11
EOF

echo "  Updated mssql-jdbc version to 12.8.2.jre11"

# Verify the file was created correctly
if [ -f "$MODDIR/pom.properties" ]; then
  if grep -q "version=12.8.2.jre11" "$MODDIR/pom.properties"; then
    echo "  ✓ Verified mssql-jdbc pom.properties"
  else
    echo "  ✗ ERROR: mssql-jdbc pom.properties verification failed!"
    exit 1
  fi
else
  echo "  ✗ ERROR: mssql-jdbc pom.properties was not created!"
  exit 1
fi

# 5) Repack the patched sqlserver jar
echo "Repacking patched sqlserver jar..."

cd sqlserver_unpack
zip -q -0 -r ../sqlserver.metabase-driver.patched.jar *
cd ..

# 6) Verify the patched jar
echo "Verifying patched jar..."
if [ ! -f "sqlserver.metabase-driver.patched.jar" ]; then
  echo "ERROR: Patched jar was not created!"
  exit 1
fi

VER_CHECK=$(unzip -p sqlserver.metabase-driver.patched.jar "META-INF/maven/com.microsoft.sqlserver/mssql-jdbc/pom.properties" 2>/dev/null | grep "^version=" | cut -d= -f2 || echo "")
if [ "$VER_CHECK" = "12.8.2.jre11" ]; then
  echo "  ✓ Verified mssql-jdbc version 12.8.2.jre11 in patched jar"
else
  echo "  ✗ ERROR: Version mismatch! Expected 12.8.2.jre11, found ${VER_CHECK}"
  exit 1
fi

# 7) Replace patched jar into build context locations
echo "Installing patched jar into build context..."

# Replace in the original location
cp -v sqlserver.metabase-driver.patched.jar "$SQLSERVER_JAR_SRC"

# Also copy to other common locations
cp -v sqlserver.metabase-driver.patched.jar "$WORKDIR/resources/modules/sqlserver.metabase-driver.jar" 2>/dev/null || true
cp -v sqlserver.metabase-driver.patched.jar /home/node/resources/modules/sqlserver.metabase-driver.jar 2>/dev/null || true
cp -v sqlserver.metabase-driver.patched.jar /root/p2-metabase/resources/modules/sqlserver.metabase-driver.jar 2>/dev/null || true
cp -v sqlserver.metabase-driver.patched.jar "$WORKDIR/drivers/sqlserver/sqlserver.metabase-driver.jar" 2>/dev/null || true
cp -v sqlserver.metabase-driver.patched.jar /root/p2-metabase/drivers/sqlserver/sqlserver.metabase-driver.jar 2>/dev/null || true

# 8) Update the uberjar to include the patched driver
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
  DRIVER_PATH_IN_JAR=""
  if [ -f "modules/sqlserver.metabase-driver.jar" ]; then
    DRIVER_PATH_IN_JAR="modules/sqlserver.metabase-driver.jar"
    echo "  Found driver at: modules/sqlserver.metabase-driver.jar"
  elif [ -f "resources/modules/sqlserver.metabase-driver.jar" ]; then
    DRIVER_PATH_IN_JAR="resources/modules/sqlserver.metabase-driver.jar"
    echo "  Found driver at: resources/modules/sqlserver.metabase-driver.jar"
  else
    echo "  WARNING: Driver not found in expected locations, creating at modules/"
    DRIVER_PATH_IN_JAR="modules/sqlserver.metabase-driver.jar"
  fi
  
  # Ensure the directory exists and replace the driver
  mkdir -p "$(dirname "$DRIVER_PATH_IN_JAR")"
  cp -f "$PATCHDIR/sqlserver.metabase-driver.patched.jar" "$DRIVER_PATH_IN_JAR"
  
  echo "  Replaced driver at: $DRIVER_PATH_IN_JAR"
  
  # Repack the uberjar
  zip -q -0 -r "$UBERJAR_PATH.new" *
  
  # Replace the original uberjar
  mv "$UBERJAR_PATH.new" "$UBERJAR_PATH"
  
  # Clean up
  cd "$PATCHDIR"
  rm -rf "$TEMP_UBER_DIR"
  
  echo "  ✓ Uberjar updated with patched driver"
fi

echo ""
echo "PATCH COMPLETE. Backups are in $BACKUPDIR"
echo "The mssql-jdbc pom.properties now shows version=12.8.2.jre11"


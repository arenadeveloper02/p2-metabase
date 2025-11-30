#!/bin/bash
# Script to verify Netty versions in the Metabase container

CONTAINER_NAME=${1:-metabase-custom-v1.3.0}

echo "=========================================="
echo "Verifying Netty Versions in Container"
echo "Container: $CONTAINER_NAME"
echo "=========================================="
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "ERROR: Container '$CONTAINER_NAME' is not running"
  echo "Available containers:"
  docker ps --format '{{.Names}}'
  exit 1
fi

echo "1. Checking driver JAR in /plugins directory (extracted at runtime):"
echo "---------------------------------------------------"

for MOD in netty-handler netty-codec-http2 netty-codec-smtp; do
  echo -n "  $MOD: "
  docker exec "$CONTAINER_NAME" sh -c \
    "unzip -p /plugins/athena.metabase-driver.jar META-INF/maven/io.netty/${MOD}/pom.properties 2>/dev/null | grep '^version=' | cut -d= -f2" 2>/dev/null || echo "NOT FOUND"
done

echo ""
echo "2. Checking driver JAR inside uberjar (nested JAR):"
echo "---------------------------------------------------"

# Extract and check the nested driver from uberjar
echo "  Extracting driver from uberjar..."
docker exec "$CONTAINER_NAME" sh -c \
  "cd /tmp && unzip -q -o /app/metabase.jar modules/athena.metabase-driver.jar 2>/dev/null || unzip -q -o /app/metabase.jar resources/modules/athena.metabase-driver.jar 2>/dev/null || echo 'Driver not found in uberjar'"

for MOD in netty-handler netty-codec-http2 netty-codec-smtp; do
  echo -n "  $MOD: "
  # Try both possible paths
  VERSION=$(docker exec "$CONTAINER_NAME" sh -c \
    "unzip -p /tmp/modules/athena.metabase-driver.jar META-INF/maven/io.netty/${MOD}/pom.properties 2>/dev/null | grep '^version=' | cut -d= -f2" 2>/dev/null || \
    docker exec "$CONTAINER_NAME" sh -c \
    "unzip -p /tmp/resources/modules/athena.metabase-driver.jar META-INF/maven/io.netty/${MOD}/pom.properties 2>/dev/null | grep '^version=' | cut -d= -f2" 2>/dev/null || \
    echo "NOT FOUND")
  echo "$VERSION"
done

# Cleanup
docker exec "$CONTAINER_NAME" sh -c "rm -rf /tmp/modules /tmp/resources" 2>/dev/null || true

echo ""
echo "3. Expected Versions:"
echo "---------------------------------------------------"
echo "  netty-handler:     4.1.118.Final (CVE-2025-24970)"
echo "  netty-codec-http2: 4.1.124.Final (CVE-2025-55163)"
echo "  netty-codec-smtp: 4.1.128.Final (CVE-2025-59419)"
echo ""

echo "4. Full pom.properties files for verification:"
echo "---------------------------------------------------"
echo ""
echo "netty-handler:"
docker exec "$CONTAINER_NAME" sh -c \
  "unzip -p /plugins/athena.metabase-driver.jar META-INF/maven/io.netty/netty-handler/pom.properties 2>/dev/null" || echo "NOT FOUND"
echo ""
echo "netty-codec-http2:"
docker exec "$CONTAINER_NAME" sh -c \
  "unzip -p /plugins/athena.metabase-driver.jar META-INF/maven/io.netty/netty-codec-http2/pom.properties 2>/dev/null" || echo "NOT FOUND"
echo ""
echo "netty-codec-smtp:"
docker exec "$CONTAINER_NAME" sh -c \
  "unzip -p /plugins/athena.metabase-driver.jar META-INF/maven/io.netty/netty-codec-smtp/pom.properties 2>/dev/null" || echo "NOT FOUND"

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="


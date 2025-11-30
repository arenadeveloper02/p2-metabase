#!/bin/bash
# Script to verify SQL Server JDBC driver version in the Metabase container

CONTAINER_NAME=${1:-metabase-custom-v1.3.0}

echo "=========================================="
echo "Verifying SQL Server JDBC Driver Version"
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

if docker exec "$CONTAINER_NAME" sh -c "test -f /plugins/sqlserver.metabase-driver.jar" 2>/dev/null; then
  echo "  Found: /plugins/sqlserver.metabase-driver.jar"
  echo ""
  echo "  mssql-jdbc version from pom.properties:"
  VERSION=$(docker exec "$CONTAINER_NAME" sh -c \
    "unzip -p /plugins/sqlserver.metabase-driver.jar META-INF/maven/com.microsoft.sqlserver/mssql-jdbc/pom.properties 2>/dev/null | grep '^version=' | cut -d= -f2" 2>/dev/null || echo "NOT FOUND")
  echo "  $VERSION"
  
  # Check if the version includes .jre11
  if [ "$VERSION" = "12.8.2" ]; then
    echo ""
    echo "  ⚠ WARNING: pom.properties shows '12.8.2' but expected '12.8.2.jre11'"
    echo "  Checking actual JAR file name..."
    # List JAR files to see if we can find the actual mssql-jdbc JAR
    docker exec "$CONTAINER_NAME" sh -c \
      "unzip -l /plugins/sqlserver.metabase-driver.jar 2>/dev/null | grep -i 'mssql.*jdbc.*jar' | head -5" || echo "  Could not find JAR file name"
  fi
  
  echo ""
  echo "  Full pom.properties:"
  docker exec "$CONTAINER_NAME" sh -c \
    "unzip -p /plugins/sqlserver.metabase-driver.jar META-INF/maven/com.microsoft.sqlserver/mssql-jdbc/pom.properties 2>/dev/null" || echo "NOT FOUND"
else
  echo "  sqlserver.metabase-driver.jar not found in /plugins"
fi

echo ""
echo "2. Checking driver JAR inside uberjar (nested JAR):"
echo "---------------------------------------------------"

# Extract and check the nested driver from uberjar
echo "  Extracting driver from uberjar..."
docker exec "$CONTAINER_NAME" sh -c \
  "cd /tmp && unzip -q -o /app/metabase.jar modules/sqlserver.metabase-driver.jar 2>/dev/null || unzip -q -o /app/metabase.jar resources/modules/sqlserver.metabase-driver.jar 2>/dev/null || echo 'Driver not found in uberjar'"

if docker exec "$CONTAINER_NAME" sh -c "test -f /tmp/modules/sqlserver.metabase-driver.jar" 2>/dev/null || \
   docker exec "$CONTAINER_NAME" sh -c "test -f /tmp/resources/modules/sqlserver.metabase-driver.jar" 2>/dev/null; then
  echo "  Found driver in uberjar"
  echo ""
  echo "  mssql-jdbc version:"
  VERSION=$(docker exec "$CONTAINER_NAME" sh -c \
    "unzip -p /tmp/modules/sqlserver.metabase-driver.jar META-INF/maven/com.microsoft.sqlserver/mssql-jdbc/pom.properties 2>/dev/null | grep '^version=' | cut -d= -f2" 2>/dev/null || \
    docker exec "$CONTAINER_NAME" sh -c \
    "unzip -p /tmp/resources/modules/sqlserver.metabase-driver.jar META-INF/maven/com.microsoft.sqlserver/mssql-jdbc/pom.properties 2>/dev/null | grep '^version=' | cut -d= -f2" 2>/dev/null || \
    echo "NOT FOUND")
  echo "  $VERSION"
  echo ""
  echo "  Full pom.properties:"
  docker exec "$CONTAINER_NAME" sh -c \
    "unzip -p /tmp/modules/sqlserver.metabase-driver.jar META-INF/maven/com.microsoft.sqlserver/mssql-jdbc/pom.properties 2>/dev/null" 2>/dev/null || \
    docker exec "$CONTAINER_NAME" sh -c \
    "unzip -p /tmp/resources/modules/sqlserver.metabase-driver.jar META-INF/maven/com.microsoft.sqlserver/mssql-jdbc/pom.properties 2>/dev/null" 2>/dev/null || \
    echo "NOT FOUND"
else
  echo "  sqlserver.metabase-driver.jar not found in uberjar"
fi

# Cleanup
docker exec "$CONTAINER_NAME" sh -c "rm -rf /tmp/modules /tmp/resources" 2>/dev/null || true

echo ""
echo "3. Expected Version (from deps.edn):"
echo "---------------------------------------------------"
echo "  mssql-jdbc: 12.8.2.jre11 (CVE-2025-59250 fix)"
echo ""
echo "  NOTE: The pom.properties may show '12.8.2' but the actual"
echo "        Maven artifact version should be '12.8.2.jre11'."
echo "        If scanner requires '12.8.2.jre11' in pom.properties,"
echo "        we may need to patch it similar to the Netty fix."
echo ""

echo "=========================================="
echo "Verification Complete"
echo "=========================================="


###################
# STAGE 1: builder
###################

FROM node:18-bullseye as builder

ARG MB_EDITION=oss
ARG VERSION
ARG IMAGE_NAME=metabase-custom:${VERSION}

WORKDIR /home/node

RUN apt-get update && apt-get upgrade -y && apt-get install wget apt-transport-https gpg curl git -y \
    && wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor | tee /etc/apt/trusted.gpg.d/adoptium.gpg > /dev/null \
    && echo "deb https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list \
    && apt-get update \
    && apt install temurin-21-jdk -y \
    && curl -O https://download.clojure.org/install/linux-install-1.11.1.1262.sh \
    && chmod +x linux-install-1.11.1.1262.sh \
    && ./linux-install-1.11.1.1262.sh

COPY . .

# version is pulled from git, but git doesn't trust the directory due to different owners
RUN git config --global --add safe.directory /home/node

# install frontend dependencies
RUN yarn --frozen-lockfile

RUN INTERACTIVE=false CI=true MB_EDITION=$MB_EDITION bin/build.sh :version ${VERSION}

# Patch drivers to fix vulnerabilities
# Install zip/unzip tools needed for the patch scripts
RUN apt-get update && apt-get install -y zip unzip && rm -rf /var/lib/apt/lists/*

# Patch Athena driver to fix Netty vulnerabilities (CVE-2025-24970, CVE-2025-55163, CVE-2025-59419)
RUN if [ -f patch_netty.sh ]; then \
      chmod +x patch_netty.sh && \
      bash patch_netty.sh "${IMAGE_NAME}"; \
    fi

# Patch SQL Server driver to fix mssql-jdbc version (CVE-2025-59250)
RUN if [ -f patch_sqlserver.sh ]; then \
      chmod +x patch_sqlserver.sh && \
      bash patch_sqlserver.sh; \
    fi

# ###################
# # STAGE 2: runner
# ###################

## Remember that this runner image needs to be the same as bin/docker/Dockerfile with the exception that this one grabs the
## jar from the previous stage rather than the local build
## we're not yet there to provide an ARM runner till https://github.com/adoptium/adoptium/issues/96 is ready

FROM eclipse-temurin:21-jre-alpine as runner

ENV FC_LANG en-US LC_CTYPE en_US.UTF-8

# dependencies
# Explicitly upgrade sqlite-libs and libexpat to fix CVEs
RUN apk add -U bash fontconfig curl font-noto font-noto-arabic font-noto-hebrew font-noto-cjk java-cacerts && \
    apk upgrade --no-cache sqlite-libs libexpat && \
    apk upgrade && \
    rm -rf /var/cache/apk/* && \
    mkdir -p /app/certs && \
    curl https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /app/certs/rds-combined-ca-bundle.pem  && \
    /opt/java/openjdk/bin/keytool -noprompt -import -trustcacerts -alias aws-rds -file /app/certs/rds-combined-ca-bundle.pem -keystore /etc/ssl/certs/java/cacerts -keypass changeit -storepass changeit && \
    curl https://cacerts.digicert.com/DigiCertGlobalRootG2.crt.pem -o /app/certs/DigiCertGlobalRootG2.crt.pem  && \
    /opt/java/openjdk/bin/keytool -noprompt -import -trustcacerts -alias azure-cert -file /app/certs/DigiCertGlobalRootG2.crt.pem -keystore /etc/ssl/certs/java/cacerts -keypass changeit -storepass changeit && \
    mkdir -p /plugins && chmod a+rwx /plugins

# add Metabase script and uberjar
COPY --from=builder /home/node/target/uberjar/metabase.jar /app/
COPY bin/docker/run_metabase.sh /app/

# expose our default runtime port
EXPOSE 3000

# run it
ENTRYPOINT ["/app/run_metabase.sh"]

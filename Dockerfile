###################
# STAGE 1: builder
###################

FROM node:22-bullseye AS builder

ARG MB_EDITION=oss
ARG VERSION

WORKDIR /home/node

# TODO: revisit and add proper comments. Original block (before HTTPS-apt rework) kept for reference:
#
# RUN apt-get update && apt-get upgrade -y && apt-get install wget apt-transport-https gpg curl git -y \
#     && wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor | tee /etc/apt/trusted.gpg.d/adoptium.gpg > /dev/null \
#     && echo "deb https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list \
#     && apt-get update \
#     && apt install temurin-21-jdk -y \
#     && curl -O https://download.clojure.org/install/linux-install-1.12.0.1488.sh \
#     && chmod +x linux-install-1.12.0.1488.sh \
#     && ./linux-install-1.12.0.1488.sh

# Use HTTPS for Debian mirrors: plain HTTP often hits "Bad header line" / timeouts behind proxies or
# flaky paths to Fastly; without a full bullseye index, temurin-21-jdk deps (java-common, libxi6, …) stay uninstallable.
RUN set -eux; \
    export DEBIAN_FRONTEND=noninteractive; \
    printf '%s\n' \
      'Acquire::Retries "5";' \
      'Acquire::http::Pipeline-Depth "0";' \
      > /etc/apt/apt.conf.d/80-docker; \
    if [ -f /etc/apt/sources.list ]; then \
      sed -i 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list; \
    fi; \
    if [ -d /etc/apt/sources.list.d ]; then \
      find /etc/apt/sources.list.d -maxdepth 1 -type f \( -name '*.list' -o -name '*.sources' \) \
        -exec sed -i 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' {} +; \
    fi; \
    apt-get update; \
    apt-get upgrade -y; \
    apt-get install -y --no-install-recommends ca-certificates wget gpg curl git; \
    wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor | tee /etc/apt/trusted.gpg.d/adoptium.gpg > /dev/null; \
    echo "deb https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends temurin-21-jdk; \
    curl -fsSL -O https://download.clojure.org/install/linux-install-1.12.0.1488.sh; \
    chmod +x linux-install-1.12.0.1488.sh; \
    ./linux-install-1.12.0.1488.sh

COPY . .

# version is pulled from git, but git doesn't trust the directory due to different owners
RUN git config --global --add safe.directory /home/node

# install frontend dependencies
RUN yarn --frozen-lockfile

RUN INTERACTIVE=false CI=true MB_EDITION=$MB_EDITION bin/build.sh :version ${VERSION}

# ###################
# # STAGE 2: runner
# ###################

## Remember that this runner image needs to be the same as bin/docker/Dockerfile with the exception that this one grabs the
## jar from the previous stage rather than the local build

FROM eclipse-temurin:21-jre-alpine AS runner

ENV FC_LANG=en-US LC_CTYPE=en_US.UTF-8

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

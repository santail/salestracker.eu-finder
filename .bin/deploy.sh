docker ps --filter "name=salestracker.eu-finder"
docker pull $IMAGE
docker rm -f salestracker.eu-finder || true
docker run -d \
           --name salestracker.eu-finder \
           --restart unless-stopped \
           -p 80:3000 \
           $IMAGE
docker ps --filter "name=salestracker.eu-finder"
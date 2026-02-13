# TestApiRedmine

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.2.8.

## Development server

Run `npm start` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.


## Run Docker Image for Redmine API on Mac
Run in terminal
```bash
$ docker run -d \
  --name redmine \
  -p 3000:3000 \
  redmine
```

## Stop/Start Docker Image for Redmine API on Mac
Stop
```bash
$ docker stop redmine
```

Start
```bash
$ docker start redmine
```

## Run Docker Image for Redmine API on Windows
1.- Install Docker Desktop `https://www.docker.com/products/docker-desktop`

Enable:
 - WSL2
 - Ubuntu integration (if prompted)

2.- Create docker-compose.yml 
Create a folder and inside it create a file:

```yaml
version: '3'

services:
  redmine:
    image: redmine:5
    ports:
      - "3000:3000"
    restart: always
    environment:
      REDMINE_DB_MYSQL: db
      REDMINE_DB_PASSWORD: example
    depends_on:
      - db

  db:
    image: mysql:8
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: example
      MYSQL_DATABASE: redmine
```

3.- Start as a service
```bash
$ docker compose up -d
```

Docker will keep it running as a service and it will be available at `http://localhost:3000`

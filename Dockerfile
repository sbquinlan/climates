# comes with python39
FROM osgeo/gdal:ubuntu-full-latest as build

# need some python extras
RUN apt-get update && apt-get install -y python3-pip
RUN pip3 install --no-cache --upgrade pip setuptools wheel

WORKDIR /app

COPY ./data/requirements.txt /app
RUN pip3 install -r requirements.txt

COPY ./data /app
RUN python3 climy.py clear all download tile

FROM nginx
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/webroot /usr/share/nginx/html
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from threading import Lock
import uuid
from geopy.geocoders import Nominatim
import math
import numpy

async_mode = None
app = Flask(__name__)
app.config['SECRET_KEY'] = uuid.uuid4().hex
socketio = SocketIO(app, async_mode=async_mode)
thread = None
thread_lock = Lock()

def coorToAngle(lat1, lng1, lat2, lng2):
    # Convert lat/lng to vector
    p1 = numpy.array([math.cos(math.radians(lat1)) * math.cos(math.radians(lng1)),
            math.cos(math.radians(lat1)) * math.sin(math.radians(lng1)),
            math.sin(math.radians(lat1))])
    p2 = numpy.array([math.cos(math.radians(lat2)) * math.cos(math.radians(lng2)),
            math.cos(math.radians(lat2)) * math.sin(math.radians(lng2)),
            math.sin(math.radians(lat2))])
    # Dot product divided by magnitudes multiplied
    numerator = numpy.dot(p1, p2)
    denominator = numpy.linalg.norm(p1) * numpy.linalg.norm(p2)
    angle = math.acos(numerator / denominator)
    return math.degrees(angle)

def angleToHeight(angle):
    rEarth = 6371000 # Radius of the Earth in meters
    observerHeight = 1.7 # Height of observer

    hypotenuse = rEarth / (math.cos(math.radians(angle)))
    height = hypotenuse - rEarth
    height -= observerHeight

    # Clip lower bound at 0m
    if height < 0:
        height = 0

    # Round decimal places based on result
    if height < 1000:
        height = round(height, 1)
    else:
        height = round(height, 0)

    return height

@app.route('/')
def index():
    return render_template('index.html', async_mode=socketio.async_mode)

@socketio.event
def submit_event(message):
    houseText = message['house']
    hereText = message['here']

    geolocator = Nominatim(user_agent='ICanSeeMyHouseFromHere')
    
    houseGeo = geolocator.geocode(houseText)
    if houseGeo == None:
        print("House location is not valid!")
        return
    print(houseGeo.latitude, houseGeo.longitude)
    houseLat = houseGeo.latitude
    houseLng = houseGeo.longitude

    hereGeo = geolocator.geocode(hereText)
    if hereGeo == None:
        print("Here location is not valid!")
        return
    print(hereGeo.latitude, hereGeo.longitude)
    hereLat = hereGeo.latitude
    hereLng = hereGeo.longitude

    angle = coorToAngle(houseLat, houseLng, hereLat, hereLng)
    print("Angle: ", angle)

    height = "ERROR"
    if angle < 90:
        height = angleToHeight(angle)
    print(height)
    emit('submit_response', {
        "height": height,
        "houseLat" : houseLat,
        "houseLng" : houseLng,
        "hereLat" : hereLat,
        "hereLng" : hereLng
    })
    return

if __name__ == '__main__':
    print("Starting!")
    socketio.run(app, debug=False, host='0.0.0.0')
    exit(0)
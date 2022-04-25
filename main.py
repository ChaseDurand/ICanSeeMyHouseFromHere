from flask import Flask, render_template, redirect
from flask_socketio import SocketIO, emit
from threading import Lock
import uuid
from geopy.geocoders import Nominatim
import math
import numpy as np

async_mode = None
app = Flask(__name__)
app.config['SECRET_KEY'] = uuid.uuid4().hex
socketio = SocketIO(app, async_mode=async_mode)
thread = None
thread_lock = Lock()

# Given lat/long coordinates, return 3d vector.
# Return vector as numpy.array.
def coorToVec(lat, lng):
    return np.array([math.cos(math.radians(lat)) * math.cos(math.radians(lng)),
        math.cos(math.radians(lat)) * math.sin(math.radians(lng)),
        math.sin(math.radians(lat))])

# Given two vectors, return the angle between them.
# Take vectors as numpy.array.
# Return angle in degrees.
def vecToAngle(v1, v2):
    # Dot product divided by magnitudes multiplied
    numerator = np.dot(v1, v2)
    denominator = np.linalg.norm(v1) * np.linalg.norm(v2)
    angle = math.acos(numerator / denominator)
    return math.degrees(angle)

def angleToHeight(angle):
    rEarth = 6371000 # Radius of the Earth in meters
    observerHeight = 1.6 # Height of observer

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

def emitError(errorMsg):
    emit('submit_response', {
        "statusMsg": errorMsg,
        "height": 0,
        "houseLat" : 0,
        "houseLng" : 0,
        "hereLat" : 0,
        "hereLng" : 0,
        "houseX" : 0,
        "houseY" : 0,
        "houseZ" : 0,
        "hereX" : 0,
        "hereY" : 0,
        "hereZ" : 0
    })
    return

@app.route('/')
def index():
    return render_template('index.html', async_mode=socketio.async_mode)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return redirect('/')

# Called when the user hits submit
@socketio.event
def submit_event(message):
    houseText = message['house']
    hereText = message['here']

    geolocator = Nominatim(user_agent='ICanSeeMyHouseFromHere')
    
    houseGeo = geolocator.geocode(houseText)
    if houseGeo == None:
        emitError("House location is not valid!")
        return
    print(houseGeo.latitude, houseGeo.longitude)
    houseLat = houseGeo.latitude
    houseLng = houseGeo.longitude

    hereGeo = geolocator.geocode(hereText)
    if hereGeo == None:
        emitError("Here location is not valid!")
        return
    print(hereGeo.latitude, hereGeo.longitude)
    hereLat = hereGeo.latitude
    hereLng = hereGeo.longitude

    houseVec = coorToVec(houseLat, houseLng)
    hereVec = coorToVec(hereLat, hereLng)
    

    angle = vecToAngle(houseVec, hereVec)
    print("Angle: ", angle)

    if angle < 90:
        height = angleToHeight(angle)
        print(height)
        emit('submit_response', {
            "statusMsg": "OK",
            "height": height,
            "houseLat" : houseLat,
            "houseLng" : houseLng,
            "hereLat" : hereLat,
            "hereLng" : hereLng,
            "houseX" : houseVec[0],
            "houseY" : houseVec[1],
            "houseZ" : houseVec[2],
            "hereX" : hereVec[0],
            "hereY" : hereVec[1],
            "hereZ" : hereVec[2]
    })
    else:
        emitError("Not possible (angle > 90 degrees).")
    return

if __name__ == '__main__':
    print("Starting!")
    socketio.run(app, debug=False, host='0.0.0.0')
    exit(0)
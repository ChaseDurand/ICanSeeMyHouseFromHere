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

def coorToAngle(lat1, long1, lat2, long2):
    # Convert lat/long to vector
    p1 = numpy.array([math.cos(math.radians(lat1)) * math.cos(math.radians(long1)),
            math.cos(math.radians(lat1)) * math.sin(math.radians(long1)),
            math.sin(math.radians(lat1))])
    p2 = numpy.array([math.cos(math.radians(lat2)) * math.cos(math.radians(long2)),
            math.cos(math.radians(lat2)) * math.sin(math.radians(long2)),
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
    loc1 = message['house']
    loc2 = message['here']

    geolocator = Nominatim(user_agent='ICanSeeMyHouseFromHere')
    
    loc = geolocator.geocode(loc1)
    if loc == None:
        print("Location 1 is not valid!")
        return
    print(loc.latitude, loc.longitude)
    lat1 = loc.latitude
    long1 = loc.longitude

    loc = geolocator.geocode(loc2)
    if loc == None:
        print("Location 2 is not valid!")
        return
    print(loc.latitude, loc.longitude)
    lat2 = loc.latitude
    long2 = loc.longitude

    angle = coorToAngle(lat1, long1, lat2, long2)
    print("Angle: ", angle)

    if angle < 90:
        height = angleToHeight(angle)
        print(height)
        emit('submit_response', {
            "height": height
        })
    else:
        print("No valid height!")    
        emit('submit_response', {
            "height": "ERROR"
        })    
    return

if __name__ == '__main__':
    print("Starting!")
    socketio.run(app, debug=False, host='0.0.0.0')
    exit(0)
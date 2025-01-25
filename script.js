"use strict";

class Places {
  id = (Date.now() + "").slice(-10);
  clicks = 0;

  constructor(coords, place) {
    this.place = place;
    this.coords = coords; // [lat,lng]
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()} , ${this.date.getFullYear()}`;
  }

  click() {
    this.clicks++;
  }
}

class Visited extends Places {
  type = "visited";
  constructor(coords, place, date) {
    super(coords, place);
    this.date = new Date(date);
    this._setDescription.bind(this);
    this._setDescription();
  }
}

class Visiting extends Places {
  type = "visiting";
  constructor(coords, place, date) {
    super(coords, place);
    this.date = new Date(date);
    this._setDescription.bind(this);
    this._setDescription();
  }
}
// APPLICATION ARCHITECTURE
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".tour");
const inputType = document.querySelector(".form__input--type");
const inputPlace = document.querySelector(".form__input--place");
const inputDate = document.querySelector(".form__input--date");
const deleteAllBtn = document.querySelector(".deleteAllBtn");

class App {
  #map;
  #mapZoom = 13;
  #mapEvent;
  #places = [];

  constructor() {
    this._getPosition();

    // Get data from Local Storage
    this._getLocalStorage();

    //Attach Event handlers
    form.addEventListener("submit", this._newPlace.bind(this));
    inputType.addEventListener("change", this._setAttributeDate.bind(this));
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your position");
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(
      `https://www.google.com/maps/@${latitude},${longitude},9z?entry=ttu&g_ep=EgoyMDI0MTIwOS4wIKXMDSoASAFQAw%3D%3D`
    );

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoom);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on("click", this._showForm.bind(this));

    this.#places.forEach((place) => {
      this._renderPlaceMarker(place);
    });
  }

  _showForm(mapE) {
    // Empty the inputs
    inputType.value = inputPlace.value = inputDate.value = "";
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputType.focus();
  }

  _hideForm() {
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _setAttributeDate() {
    let date = new Date();
    if (inputType.value === "visited") {
      inputDate.setAttribute("max", date.toISOString().split("T")[0]);
      inputDate.removeAttribute("min");
    }
    if (inputType.value === "visiting") {
      inputDate.setAttribute(
        "min",
        // prettier-ignore
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,0)}-${String(date.getDate() + 1).padStart(2, 0)}`
      );
      inputDate.removeAttribute("max");
    }
  }

  _newPlace(e) {
    e.preventDefault();

    // Get data from the form
    const type = inputType.value;
    const place = inputPlace.value;
    const date = inputDate.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let places;

    // If activity visited, create visited object
    if (type === "visited") {
      places = new Visited([lat, lng], place, date); // Object which is created by Visited class
    }

    // If activity visiting, create visiting object
    if (type === "visiting") {
      places = new Visiting([lat, lng], place, date);
    }

    // Add the new object to places array
    this.#places.push(places);

    // Render workout on map as marker
    this._renderPlaceMarker(places);

    // Render place on list
    this._renderPlace(places);

    // Hide form + Clear input fields
    this._hideForm();

    // Delete btn visibility
    this._checkDeleteAllButtonVisibility();

    // Set local storage to all workouts
    this._setLocalStorage();
  }
  _renderPlaceMarker(places) {
    // Display marker
    const marker = L.marker(places.coords).addTo(this.#map);
    marker
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${places.type}-popup`,
        })
      )
      .setPopupContent(
        `${places.type === "visited" ? "🛬" : "🛫"} ${places.description}`
      )
      .openPopup();
  }
  _renderPlace(places) {
    let html = `
    <li class="place place--${places.type}" data-id="${places.id}">
      <h2 class="place__title">${places.description}
      </h2>
      <div class="place__details">
        <span class="place__icon">${
          places.type === "visited" ? "🛬" : "🛫"
        }</span>
        <span class="place__value">You ${
          places.type == "visited" ? "have visited" : "are going to visit"
        } ${places.place} 💗 </span>
      </div>
      <button class="deleteBtn">x</button>
    </li>`;

    form.insertAdjacentHTML("afterend", html);
    this._deletePlaces();
    this._deletePlace();
  }

  _moveToPopup(e) {
    const placeEl = e.target.closest(".place");

    if (!placeEl) return;

    if (placeEl) {
      const place = this.#places.find(
        (place) => place.id === placeEl.dataset.id
      );

      if (!place) return;

      this.#map.setView(place.coords, this.#mapZoom, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }
    // using public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem("places", JSON.stringify(this.#places));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("places"));
    if (!data) return;

    this.#places = data;

    this.#places.forEach((place) => {
      this._renderPlace(place);
    });

    this._checkDeleteAllButtonVisibility();
  }

  _deletePlace() {
    const placeElements = document.querySelectorAll(".deleteBtn"); // Select all delete buttons

    placeElements.forEach((deleteBtn) => {
      // Add event listener to each button
      deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const placeEl = e.target.closest(".place");

        if (!placeEl) return;

        const placeId = placeEl.dataset.id;

        // 1. Remove from Local Storage
        this.#places = this.#places.filter((place) => place.id !== placeId);
        this._setLocalStorage(); // Update Local Storage

        // 2. Remove from the DOM
        placeEl.remove();

        // 3. Remove Marker from Map
        this.#map.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            const markerLatLng = layer.getLatLng();
            const placeToRemove = this.#places.find((place) => {
              return (
                place.coords[0] === markerLatLng.lat &&
                place.coords[1] === markerLatLng.lng
              );
            });
            if (!placeToRemove) {
              this.#map.removeLayer(layer);
            }
          }
        });

        // Hide the delete all button if there are no more places
        if (this.#places.length === 0) {
          deleteAllBtn.style.visibility = "hidden";
        }
      });
    });
  }

  _deletePlaces() {
    document.querySelector(".deleteAllBtn").addEventListener("click", (e) => {
      e.preventDefault();
      this.reset();
      document.querySelectorAll(".place").remove();
      this._checkDeleteAllButtonVisibility();
    });
  }

  _checkDeleteAllButtonVisibility() {
    if (this.#places.length === 0) {
      deleteAllBtn.style.visibility = "hidden";
    } else {
      deleteAllBtn.style.visibility = "visible";
    }
  }

  reset() {
    localStorage.removeItem("places");
    location.reload();
    this._checkDeleteAllButtonVisibility();
  }
}

const app = new App();

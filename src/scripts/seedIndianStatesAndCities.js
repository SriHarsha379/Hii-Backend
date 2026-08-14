/**
 * seedIndianStatesAndCities.js
 *
 * One-off script to seed a comprehensive list of Indian cities across all
 * 28 states, plus Delhi (added specifically because it's requested as a
 * preferred city below - modeled as its own "state" entry for simplicity,
 * same pragmatic approach most city-picker datasets use for NCT Delhi).
 *
 * PREFERRED CITIES:
 * Bangalore, Delhi, Goa, and Mumbai are marked is_preferred: true, so the
 * app's city picker can show them as a shortlist at the top. This does
 * NOT limit which cities are available overall - every city below is
 * still created and browsable/searchable, is_preferred is purely a
 * display/priority hint (see getTopCities in authController.js, which
 * now sorts preferred cities first but still returns everyone).
 *
 * WHY STATES ARE SEEDED TOO:
 * The City model requires a valid state_id (ObjectId ref "State") - a
 * city can't be created without one. So this script first ensures every
 * state (and Delhi) exists, then creates cities linked to the correct one.
 *
 * SAFE TO RE-RUN:
 * Both states and cities are upserted by name (case-insensitive match) -
 * running this again won't create duplicates. If a city already exists,
 * its is_preferred flag IS updated to match this script (so re-running
 * after adding a new preferred city works as expected), but nothing else
 * about it is overwritten.
 *
 * USAGE:
 *   node src/scripts/seedIndianStatesAndCities.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { State, City } from "../model/index.js";

dotenv.config();

// City names that should be flagged as preferred (shown as a shortlist
// at the top of the picker). Matched case-insensitively against city_name.
const PREFERRED_CITY_NAMES = ["bangalore", "delhi", "goa", "mumbai"];

const STATES_AND_CITIES = {
  "Andhra Pradesh": [
    { name: "Amaravati", lat: 16.5062, lng: 80.6480 },
    { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
    { name: "Vijayawada", lat: 16.5062, lng: 80.6480 },
    { name: "Guntur", lat: 16.3067, lng: 80.4365 },
    { name: "Tirupati", lat: 13.6288, lng: 79.4192 },
    { name: "Nellore", lat: 14.4426, lng: 79.9865 },
    { name: "Kurnool", lat: 15.8281, lng: 78.0373 },
    { name: "Rajahmundry", lat: 17.0005, lng: 81.8040 },
    { name: "Kadapa", lat: 14.4674, lng: 78.8241 },
  ],
  "Arunachal Pradesh": [
    { name: "Itanagar", lat: 27.0844, lng: 93.6053 },
    { name: "Tawang", lat: 27.5859, lng: 91.8594 },
  ],
  "Assam": [
    { name: "Guwahati", lat: 26.1445, lng: 91.7362 },
    { name: "Dibrugarh", lat: 27.4728, lng: 94.9120 },
    { name: "Silchar", lat: 24.8333, lng: 92.7789 },
    { name: "Jorhat", lat: 26.7509, lng: 94.2037 },
    { name: "Tezpur", lat: 26.6338, lng: 92.8000 },
  ],
  "Bihar": [
    { name: "Patna", lat: 25.5941, lng: 85.1376 },
    { name: "Gaya", lat: 24.7955, lng: 84.9994 },
    { name: "Muzaffarpur", lat: 26.1225, lng: 85.3906 },
    { name: "Bhagalpur", lat: 25.2425, lng: 86.9842 },
    { name: "Darbhanga", lat: 26.1542, lng: 85.8918 },
    { name: "Purnia", lat: 25.7771, lng: 87.4753 },
  ],
  "Chhattisgarh": [
    { name: "Raipur", lat: 21.2514, lng: 81.6296 },
    { name: "Bhilai", lat: 21.1938, lng: 81.3509 },
    { name: "Bilaspur", lat: 22.0797, lng: 82.1409 },
    { name: "Korba", lat: 22.3595, lng: 82.7501 },
    { name: "Durg", lat: 21.1904, lng: 81.2849 },
  ],
  "Goa": [
    { name: "Goa", lat: 15.2993, lng: 74.1240 },
    { name: "Panaji", lat: 15.4909, lng: 73.8278 },
    { name: "Margao", lat: 15.2832, lng: 73.9862 },
    { name: "Vasco da Gama", lat: 15.3955, lng: 73.8154 },
    { name: "Mapusa", lat: 15.5937, lng: 73.8142 },
    { name: "Calangute", lat: 15.5439, lng: 73.7553 },
  ],
  "Gujarat": [
    { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
    { name: "Surat", lat: 21.1702, lng: 72.8311 },
    { name: "Vadodara", lat: 22.3072, lng: 73.1812 },
    { name: "Rajkot", lat: 22.3039, lng: 70.8022 },
    { name: "Gandhinagar", lat: 23.2156, lng: 72.6369 },
    { name: "Bhavnagar", lat: 21.7645, lng: 72.1519 },
    { name: "Jamnagar", lat: 22.4707, lng: 70.0577 },
    { name: "Junagadh", lat: 21.5222, lng: 70.4579 },
  ],
  "Haryana": [
    { name: "Gurugram", lat: 28.4595, lng: 77.0266 },
    { name: "Faridabad", lat: 28.4089, lng: 77.3178 },
    { name: "Panchkula", lat: 30.6942, lng: 76.8606 },
    { name: "Karnal", lat: 29.6857, lng: 76.9905 },
    { name: "Panipat", lat: 29.3909, lng: 76.9635 },
    { name: "Hisar", lat: 29.1492, lng: 75.7217 },
    { name: "Ambala", lat: 30.3782, lng: 76.7767 },
  ],
  "Himachal Pradesh": [
    { name: "Shimla", lat: 31.1048, lng: 77.1734 },
    { name: "Manali", lat: 32.2432, lng: 77.1892 },
    { name: "Dharamshala", lat: 32.2190, lng: 76.3234 },
    { name: "Solan", lat: 30.9045, lng: 77.0967 },
    { name: "Kullu", lat: 31.9576, lng: 77.1095 },
  ],
  "Jharkhand": [
    { name: "Ranchi", lat: 23.3441, lng: 85.3096 },
    { name: "Jamshedpur", lat: 22.8046, lng: 86.2029 },
    { name: "Dhanbad", lat: 23.7957, lng: 86.4304 },
    { name: "Bokaro", lat: 23.6693, lng: 86.1511 },
    { name: "Deoghar", lat: 24.4823, lng: 86.6961 },
  ],
  "Karnataka": [
    { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
    { name: "Mysuru", lat: 12.2958, lng: 76.6394 },
    { name: "Mangaluru", lat: 12.9141, lng: 74.8560 },
    { name: "Hubballi", lat: 15.3647, lng: 75.1240 },
    { name: "Belagavi", lat: 15.8497, lng: 74.4977 },
    { name: "Udupi", lat: 13.3409, lng: 74.7421 },
    { name: "Davanagere", lat: 14.4644, lng: 75.9932 },
  ],
  "Kerala": [
    { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
    { name: "Kochi", lat: 9.9312, lng: 76.2673 },
    { name: "Kozhikode", lat: 11.2588, lng: 75.7804 },
    { name: "Thrissur", lat: 10.5276, lng: 76.2144 },
    { name: "Kollam", lat: 8.8932, lng: 76.6141 },
    { name: "Kannur", lat: 11.8745, lng: 75.3704 },
    { name: "Alappuzha", lat: 9.4981, lng: 76.3388 },
  ],
  "Madhya Pradesh": [
    { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
    { name: "Indore", lat: 22.7196, lng: 75.8577 },
    { name: "Gwalior", lat: 26.2183, lng: 78.1828 },
    { name: "Jabalpur", lat: 23.1815, lng: 79.9864 },
    { name: "Ujjain", lat: 23.1765, lng: 75.7885 },
    { name: "Sagar", lat: 23.8388, lng: 78.7378 },
  ],
  "Maharashtra": [
    { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
    { name: "Pune", lat: 18.5204, lng: 73.8567 },
    { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
    { name: "Nashik", lat: 19.9975, lng: 73.7898 },
    { name: "Aurangabad", lat: 19.8762, lng: 75.3433 },
    { name: "Thane", lat: 19.2183, lng: 72.9781 },
    { name: "Kolhapur", lat: 16.7050, lng: 74.2433 },
    { name: "Solapur", lat: 17.6599, lng: 75.9064 },
  ],
  "Manipur": [
    { name: "Imphal", lat: 24.8170, lng: 93.9368 },
  ],
  "Meghalaya": [
    { name: "Shillong", lat: 25.5788, lng: 91.8933 },
  ],
  "Mizoram": [
    { name: "Aizawl", lat: 23.7271, lng: 92.7176 },
  ],
  "Nagaland": [
    { name: "Kohima", lat: 25.6751, lng: 94.1086 },
    { name: "Dimapur", lat: 25.9091, lng: 93.7266 },
  ],
  "Odisha": [
    { name: "Bhubaneswar", lat: 20.2961, lng: 85.8245 },
    { name: "Cuttack", lat: 20.4625, lng: 85.8828 },
    { name: "Puri", lat: 19.8135, lng: 85.8312 },
    { name: "Rourkela", lat: 22.2604, lng: 84.8536 },
    { name: "Berhampur", lat: 19.3149, lng: 84.7941 },
  ],
  "Punjab": [
    { name: "Amritsar", lat: 31.6340, lng: 74.8723 },
    { name: "Ludhiana", lat: 30.9010, lng: 75.8573 },
    { name: "Jalandhar", lat: 31.3260, lng: 75.5762 },
    { name: "Mohali", lat: 30.7046, lng: 76.7179 },
    { name: "Patiala", lat: 30.3398, lng: 76.3869 },
    { name: "Bathinda", lat: 30.2110, lng: 74.9455 },
  ],
  "Rajasthan": [
    { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
    { name: "Udaipur", lat: 24.5854, lng: 73.7125 },
    { name: "Jodhpur", lat: 26.2389, lng: 73.0243 },
    { name: "Kota", lat: 25.2138, lng: 75.8648 },
    { name: "Ajmer", lat: 26.4499, lng: 74.6399 },
    { name: "Bikaner", lat: 28.0229, lng: 73.3119 },
    { name: "Alwar", lat: 27.5530, lng: 76.6346 },
  ],
  "Sikkim": [
    { name: "Gangtok", lat: 27.3389, lng: 88.6065 },
  ],
  "Tamil Nadu": [
    { name: "Chennai", lat: 13.0827, lng: 80.2707 },
    { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
    { name: "Madurai", lat: 9.9252, lng: 78.1198 },
    { name: "Tiruchirappalli", lat: 10.7905, lng: 78.7047 },
    { name: "Salem", lat: 11.6643, lng: 78.1460 },
    { name: "Tirunelveli", lat: 8.7139, lng: 77.7567 },
    { name: "Vellore", lat: 12.9165, lng: 79.1325 },
  ],
  "Telangana": [
    { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
    { name: "Warangal", lat: 17.9689, lng: 79.5941 },
    { name: "Nizamabad", lat: 18.6725, lng: 78.0941 },
    { name: "Karimnagar", lat: 18.4386, lng: 79.1288 },
  ],
  "Tripura": [
    { name: "Agartala", lat: 23.8315, lng: 91.2868 },
  ],
  "Uttar Pradesh": [
    { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
    { name: "Kanpur", lat: 26.4499, lng: 80.3319 },
    { name: "Noida", lat: 28.5355, lng: 77.3910 },
    { name: "Varanasi", lat: 25.3176, lng: 82.9739 },
    { name: "Agra", lat: 27.1767, lng: 78.0081 },
    { name: "Ghaziabad", lat: 28.6692, lng: 77.4538 },
    { name: "Meerut", lat: 28.9845, lng: 77.7064 },
    { name: "Allahabad", lat: 25.4358, lng: 81.8463 },
    { name: "Bareilly", lat: 28.3670, lng: 79.4304 },
    { name: "Gorakhpur", lat: 26.7606, lng: 83.3732 },
  ],
  "Uttarakhand": [
    { name: "Dehradun", lat: 30.3165, lng: 78.0322 },
    { name: "Haridwar", lat: 29.9457, lng: 78.1642 },
    { name: "Rishikesh", lat: 30.0869, lng: 78.2676 },
    { name: "Nainital", lat: 29.3803, lng: 79.4636 },
  ],
  "West Bengal": [
    { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
    { name: "Siliguri", lat: 26.7271, lng: 88.3953 },
    { name: "Durgapur", lat: 23.5204, lng: 87.3119 },
    { name: "Asansol", lat: 23.6889, lng: 86.9661 },
    { name: "Howrah", lat: 22.5958, lng: 88.2636 },
  ],
  "Delhi": [
    { name: "Delhi", lat: 28.7041, lng: 77.1025 },
  ],
};

const seedIndianStatesAndCities = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    let statesCreated = 0;
    let statesExisting = 0;
    let citiesCreated = 0;
    let citiesExisting = 0;
    let citiesFlaggedPreferred = 0;

    for (const [stateName, cities] of Object.entries(STATES_AND_CITIES)) {
      let state = await State.findOne({
        state_name: { $regex: new RegExp(`^${stateName}$`, "i") },
      });

      if (!state) {
        state = await State.create({
          state_name: stateName,
          is_active: true,
          is_deleted: false,
        });
        statesCreated++;
        console.log(`✅ Created state "${stateName}"`);
      } else {
        statesExisting++;
      }

      for (const city of cities) {
        const isPreferred = PREFERRED_CITY_NAMES.includes(
          city.name.trim().toLowerCase()
        );

        const existingCity = await City.findOne({
          city_name: { $regex: new RegExp(`^${city.name}$`, "i") },
        });

        if (existingCity) {
          citiesExisting++;
          if (existingCity.is_preferred !== isPreferred) {
            await City.updateOne(
              { _id: existingCity._id },
              { $set: { is_preferred: isPreferred } }
            );
            if (isPreferred) citiesFlaggedPreferred++;
          }
          continue;
        }

        await City.create({
          state_id: state._id,
          city_name: city.name,
          latitude: city.lat,
          longitude: city.lng,
          is_active: true,
          is_deleted: false,
          is_preferred: isPreferred,
        });
        citiesCreated++;
        if (isPreferred) citiesFlaggedPreferred++;
        console.log(
          `  ✅ Added city "${city.name}" (${stateName})${
            isPreferred ? "  ⭐ preferred" : ""
          }`
        );
      }
    }

    console.log("\n──────────── SUMMARY ────────────");
    console.log(`States: ${statesCreated} created, ${statesExisting} already existed`);
    console.log(`Cities: ${citiesCreated} created, ${citiesExisting} already existed`);
    console.log(`Preferred cities flagged: ${citiesFlaggedPreferred}`);
    console.log("──────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding states/cities:", error);
    process.exit(1);
  }
};

seedIndianStatesAndCities();
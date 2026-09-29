# 🚗 Australian Road Safety Insights

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-brightgreen?style=flat-square&logo=github)](https://janysy2710.github.io/Australian-Road-Safety-Insights-Website/)
[![Course](https://img.shields.io/badge/Course-Data_Visualisation-blue?style=flat-square)](#)
[![Data Source](https://img.shields.io/badge/Data_Source-BITRE-orange?style=flat-square)](https://www.bitre.gov.au/)

An interactive web platform designed to analyze, visualize, and communicate national road safety trends across Australia. Built as a course assignment for **COS30045 Data Visualisation**, this project transforms complex raw government datasets into intuitive, user-driven data visualisations to highlight fatality metrics, demographic injury distributions, and seasonal crash patterns.

**[View Live Website](https://janysy2710.github.io/Australian-Road-Safety-Insights-Website/)**

---

## 📌 Features & Visualisations

### 1. State-by-State Fatality Choropleth Map
* **Overview:** Interactive geographic map displaying road fatality counts across Australian states and territories.
* **Key Interactivity:**
  * Dynamic year slider and automated timeline playback animation.
  * Hover tooltips and highlight interactions linked directly to color intensity scales.
  * Geographic breakdown isolating high-density corridors vs. regional trends.

### 2. Demographic Hospitalisations Sunburst Chart
* **Overview:** Hierarchical visual breakdown of non-fatal, hospitalised road injuries grouped by road user categories (drivers, motorcyclists, pedestrians).
* **Key Interactivity:**
  * Drill-down navigation (click-to-zoom into specific categories or sub-groups).
  * Demographic filters by **Age Group** and **Gender**.
  * Dynamic aggregate view toggles.

### 3. Seasonal Trends Multi-Chart Dashboard
* **Overview:** A coordinated multi-chart interface tracking temporal incident behaviors across multi-decade spans.
* **Components:**
  * **Yearly Trends:** Historical bar chart highlighting macro changes over time.
  * **Monthly Distribution:** Line chart pinpointing seasonal variations and holiday spikes.
  * **Day of Week:** Behavioral breakdowns isolating weekend vs. weekday risks.
  * **Time-of-Day:** Hour-by-hour distribution scatterplot detailing peak impact hours.
* **Key Interactivity:** Cross-chart filtering (selecting a year updates all four visualizations synchronously).

---

## 🛠️ Data Pipeline & Technology Stack

### Data Processing (ETL Workflow)
* **Source:** Official datasets from the **Bureau of Infrastructure and Transport Research Economics (BITRE)**:
  * *Australian Road Deaths Database*
  * *Hospitalised Injury Data*
* **ETL Tool:** **KNIME Analytics Platform**
* **Processing Steps:** Raw data cleaning, missing-value imputation, categorical standardization, aggregation, and geo-coordinate formatting for front-end consumption.

### Front-End Technologies
* **HTML5 / CSS3 / JavaScript (ES6+)**
* **D3.js / GeoJSON** (Custom geospatial rendering and hierarchical sunburst layouts)
* **GSAP / ScrollTrigger** (Interactive scroll-based animations)

---

## 🚀 Local Development Setup

To run this project locally:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/janysy2710/Australian-Road-Safety-Insights-Website.git](https://github.com/janysy2710/Australian-Road-Safety-Insights-Website.git)

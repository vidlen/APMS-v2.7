# APMS-V2.5
SHIAPMS is a dashboard for a web based Airport Pavement Management System (APMS) of Soekarno-Hatta Internatonal Airport (SHIA)	

This project is created as a part of thesis defense for Author	

This version of APMS is created for public use and view	

DUMMY DATA IS USED IN THIS PUBLIC REPOSITORY - DOES NOT REFLECT REAL PAVEMENT CONDITIONS

# Pavement Condition Index (PCI)
This tab features a layout of Soekarno-Hatta International Airport that consist of 75 branches.  This tab features informations such as PCI valeu, PCN value, Dimension, and Last Major Construction Year.  This tab shows user of the current condition of airside pavement in Soekarno-Hatta International Airport.  


# PCI Forecasting
This tab features a forecasting of PCI value for upcoming years. In this thesis, PCI Forecasting is calculated using Markov Chain. The result from PCI forecasting is used as a reference data for building a comprehensive maintenance and rehabilitation plan.


# Rehabilitation Plan
This tab consist of rehabilitation plan for maintaining and improving condition of airside pavement. This rehabilitation plan is devised using four case study which are:

1. Seal Coat / Crack Sealing --> For PCI Value ≤ 80

2. 5 cm Overlay --> For PCI Value ≤ 65

3. 6 cm Overlay --> For PCI Value ≤ 53

4. 12 cm Structural Overlay --> For PCI Value ≤ 40

# Admin Page
Admin page is a feature used to edit or add datasets inside the web. Admin page is used to add a new survey year datasets or edit PCI value of a branch. Inside admin page there are GEOJSON templates to help admins for editing branch information simultaneously.

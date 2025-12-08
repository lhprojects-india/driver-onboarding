import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Debug helper to log fountainData structure for troubleshooting
 * @param {Object} fountainData - The fountainData object from user data
 * @param {string} context - Context where this is being called (for logging)
 */
export function debugFountainDataStructure(fountainData, context = '') {
  const debugInfo = {
    context,
    hasFountainData: !!fountainData,
    hasData: !!fountainData?.data,
    hasApplicant: !!fountainData?.applicant,
    // Check all possible MOT paths
    motPaths: {
      'fountainData.data.mot': fountainData?.data?.mot,
      'fountainData.mot': fountainData?.mot,
      'fountainData.applicant.data.mot': fountainData?.applicant?.data?.mot,
    },
    // Check all possible vehicle type paths
    vehicleTypePaths: {
      'fountainData.vehicle_type': fountainData?.vehicle_type,
      'fountainData.data.vehicle_type': fountainData?.data?.vehicle_type,
      'fountainData.vehicle': fountainData?.vehicle,
      'fountainData.applicant.data.vehicle_type': fountainData?.applicant?.data?.vehicle_type,
    },
    // Structure info
    topLevelKeys: fountainData ? Object.keys(fountainData).slice(0, 20) : [], // Limit to avoid huge logs
    dataKeys: fountainData?.data ? Object.keys(fountainData.data).slice(0, 20) : [],
    applicantKeys: fountainData?.applicant ? Object.keys(fountainData.applicant).slice(0, 20) : [],
  };
  
  console.log('🔍 Fountain Data Structure Debug:', debugInfo);
  return debugInfo;
}

/**
 * Extract and categorize vehicle type from fountainData.data.mot
 * Checks multiple paths since fountainData structure may vary
 * @param {Object} fountainData - The fountainData object from user data
 * @param {boolean} debug - Whether to log debug information
 * @returns {string} - "van" or "car"
 */
export function getVehicleTypeFromMOT(fountainData, debug = false) {
  // Debug logging if requested
  if (debug) {
    debugFountainDataStructure(fountainData, 'getVehicleTypeFromMOT');
  }

  // Check if fountainData exists
  if (!fountainData) {
    if (debug) console.warn('⚠️ No fountainData provided, defaulting to "car"');
    return "car";
  }

  // Try multiple paths for MOT data (webhook structure can vary)
  let mot = null;
  const pathsToCheck = [
    () => fountainData.data?.mot,                    // Primary: fountainData.data.mot
    () => fountainData.mot,                           // Direct: fountainData.mot
    () => fountainData.applicant?.data?.mot,          // Nested: fountainData.applicant.data.mot
    () => fountainData.data?.vehicle_type,            // Alternative: data.vehicle_type
    () => fountainData.vehicle_type,                  // Direct: vehicle_type
    () => fountainData.vehicle,                       // Direct: vehicle
    () => fountainData.applicant?.data?.vehicle_type, // Nested: applicant.data.vehicle_type
  ];

  for (const getPath of pathsToCheck) {
    try {
      const value = getPath();
      if (value) {
        mot = String(value).toLowerCase().trim();
        if (debug) {
          const pathName = getPath.toString().match(/fountainData[^)]*/)?.[0] || 'unknown';
          console.log(`✅ Found vehicle data via ${pathName}:`, mot);
        }
        break;
      }
    } catch (e) {
      // Continue to next path if this one fails
    }
  }
  
  // If we found MOT or vehicle data, process it
  if (mot) {
    // Van category - check for "van" (case-insensitive)
    if (mot.includes("van")) {
      if (debug) console.log('✅ Vehicle type determined: van');
      return "van";
    }
    
    // Car categories: SUV, 7 seater (with variations), Hatchback, Sedan, Saloon, Estate
    const carTypes = [
      "suv",
      "7 seater", "7-seater", "7seater",
      "hatchback",
      "sedan",
      "saloon",
      "estate"
    ];
    
    for (const carType of carTypes) {
      // Remove spaces and dashes for comparison to handle variations
      const normalizedMot = mot.replace(/[\s-]/g, "");
      const normalizedCarType = carType.replace(/[\s-]/g, "");
      if (normalizedMot.includes(normalizedCarType)) {
        if (debug) console.log(`✅ Vehicle type determined: car (matched "${carType}")`);
        return "car";
      }
    }
    
    // If mot contains vehicle info but doesn't match specific types, default to car
    if (debug) console.log('ℹ️ Vehicle data found but no specific match, defaulting to "car"');
    return "car";
  }
  
  // No MOT or vehicle data found
  if (debug) {
    console.warn('⚠️ MOT/vehicle data not found in any expected location:', {
      hasData: !!fountainData.data,
      hasApplicant: !!fountainData.applicant,
      dataKeys: fountainData.data ? Object.keys(fountainData.data) : [],
      applicantKeys: fountainData.applicant ? Object.keys(fountainData.applicant) : [],
      topLevelKeys: Object.keys(fountainData)
    });
  }
  
  // Default to "car" if MOT data is not available
  return "car";
}

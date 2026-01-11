export const cities = [
  {
    citySlug: "paris",
    cityName: "Paris",
    country: "France",
    liteApiLocationId: null,
    query: "Paris, France",
    title: "Best Hotels in Paris - LuxeStay",
    description: "Book the best luxury hotels in Paris. Enjoy exclusive deals and premium amenities.",
    shortIntro: "Experience the City of Light in unparalleled style. From views of the Eiffel Tower to historic boutiques in Le Marais, find your perfect Parisian retreat.",
    longDescription: "<p>Paris is a city that needs no introduction. Home to some of the world's most iconic landmarks, including the Eiffel Tower, the Louvre Museum, and Notre-Dame Cathedral, it offers a blend of history, culture, and romance that is unmatched.</p><p>Our curated selection of hotels in Paris ranges from opulent palaces with Michelin-starred dining to charming boutique hotels tucked away in cobblestone streets. Whether you're here for fashion week, a romantic getaway, or a business trip, LuxeStay ensures your accommodation is as memorable as the city itself.</p>",
    travelTags: ["Luxury", "Romance", "Culture", "Gastronomy"],
    bestAreas: [
      "Le Marais - Best for history and boutiques",
      "Saint-Germain-des-Prés - Best for literary cafes and luxury",
      "Champs-Élysées - Best for shopping and landmarks",
      "Montmartre - Best for artistic vibes and views"
    ],
    bestTimeToVisit: "The best time to visit Paris is from April to June or October to November when the weather is mild and the crowds are smaller. Winter offers a magical atmosphere with holiday lights.",
    averageHotelPrice: "$250 - $800 per night"
  },
  {
    citySlug: "london",
    cityName: "London",
    country: "UK",
    liteApiLocationId: null,
    query: "London, UK",
    title: "Top Hotels in London - LuxeStay",
    description: "Discover top-rated hotels in London. Perfect for business and leisure travelers.",
    shortIntro: "Immerse yourself in the vibrant history and modern energy of London. Stay steps away from Big Ben, the West End theatres, and world-class shopping.",
    longDescription: "<p>London is a global capital of culture, finance, and history. From the royal grandeur of Buckingham Palace to the edgy creativity of Shoreditch, the city offers diverse experiences for every traveler.</p><p>Choose from our handpicked luxury hotels in Mayfair, Kensington, and Soho. Enjoy traditional afternoon tea, stunning skyline views, and easy access to the London Underground. LuxeStay connects you with the finest British hospitality.</p>",
    travelTags: ["Business", "History", "Theatre", "Shopping"],
    bestAreas: [
      "Mayfair - Best for luxury and fine dining",
      "Soho - Best for nightlife and theatre",
      "Kensington - Best for museums and families",
      "Shoreditch - Best for street art and hip cafes"
    ],
    bestTimeToVisit: "Late spring (March to May) and early autumn (September to October) are ideal. Summer brings festivals but larger crowds.",
    averageHotelPrice: "$200 - $700 per night"
  },
  {
    citySlug: "new-york",
    cityName: "New York",
    country: "USA",
    liteApiLocationId: null,
    query: "New York, USA",
    title: "Luxury Hotels in New York - LuxeStay",
    description: "Experience the best of NYC with our curated selection of luxury hotels.",
    shortIntro: "Feel the pulse of the city that never sleeps. From Central Park views to SoHo lofts, find the ultimate base for your New York adventure.",
    longDescription: "<p>New York City is a dazzling metropolis of skyscrapers, arts, and culinary excellence. Whether you're catching a Broadway show, exploring the Met, or walking across the Brooklyn Bridge, the energy of NYC is contagious.</p><p>Our collection includes iconic 5-star hotels in Midtown Manhattan, trendy spots in Tribeca, and quiet sanctuaries on the Upper East Side. Book with LuxeStay for exclusive rates and premium service in the Big Apple.</p>",
    travelTags: ["City Break", "Nightlife", "Arts", "Shopping"],
    bestAreas: [
      "Midtown Manhattan - Best for first-time visitors and sightseeing",
      "SoHo - Best for fashion and cast-iron architecture",
      "Williamsburg - Best for trendy vibes and skyline views",
      "Upper East Side - Best for museums and luxury shopping"
    ],
    bestTimeToVisit: "Fall (September to November) and Spring (April to June) offer pleasant weather. December is magical for holiday decorations.",
    averageHotelPrice: "$300 - $900 per night"
  },
  {
    citySlug: "dubai",
    cityName: "Dubai",
    country: "UAE",
    liteApiLocationId: null,
    query: "Dubai, UAE",
    title: "Exquisite Hotels in Dubai - LuxeStay",
    description: "Stay in Dubai's most stunning hotels. Best prices guaranteed.",
    shortIntro: "Discover the height of luxury in the desert. Experience world-class shopping, futuristic architecture, and pristine beaches in Dubai.",
    longDescription: "<p>Dubai is synonymous with luxury and innovation. Home to the Burj Khalifa, the Palm Jumeirah, and vast desert dunes, it is a destination that defies expectations.</p><p>Stay in underwater suites, desert resorts, or skyscraping towers. Our Dubai hotel selection focuses on providing the utmost in comfort, service, and extravagance. Perfect for sun-seekers, shoppers, and adventure lovers alike.</p>",
    travelTags: ["Luxury", "Beach", "Shopping", "Desert Safari"],
    bestAreas: [
      "Downtown Dubai - Best for Burj Khalifa and Dubai Mall",
      "Palm Jumeirah - Best for luxury beach resorts",
      "Dubai Marina - Best for waterfront dining and nightlife",
      "Jumeirah Beach Residence (JBR) - Best for beach and walk"
    ],
    bestTimeToVisit: "November to March is the best time to visit Dubai to enjoy cooler, pleasant weather perfect for outdoor activities.",
    averageHotelPrice: "$150 - $600 per night"
  }
];

export const getCityBySlug = (slug) => cities.find(c => c.citySlug === slug?.toLowerCase());

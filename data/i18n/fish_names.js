/**
 * FISHAO - Fish Names Bilingual Dictionary (CS / EN)
 * 615 Fish Translations
 */
(function () {
  'use strict';

  var fishNames = {
    "14": {
        "cs": "Piraňa obecná",
        "en": "Piranha"
    },
    "15": {
        "cs": "Arapaima velká",
        "en": "Arapaima"
    },
    "16": {
        "cs": "Parma obecná",
        "en": "Barbel"
    },
    "17": {
        "cs": "Hořavka duhová",
        "en": "Bitterling"
    },
    "18": {
        "cs": "Okounek pstruhový",
        "en": "Largemouth Bass"
    },
    "20": {
        "cs": "Slunečnice velkoploutvá",
        "en": "Bluegill"
    },
    "22": {
        "cs": "Marlín modrý",
        "en": "Blue Marlin"
    },
    "28": {
        "cs": "Kapr obecný",
        "en": "Common Carp"
    },
    "32": {
        "cs": "Sumec velký",
        "en": "Wels Catfish"
    },
    "33": {
        "cs": "Vyza velká",
        "en": "Beluga Sturgeon"
    },
    "34": {
        "cs": "Siven severní",
        "en": "Arctic Char"
    },
    "35": {
        "cs": "Losos masu",
        "en": "Cherry Salmon"
    },
    "36": {
        "cs": "Latimérie podivná",
        "en": "Coelacanth"
    },
    "37": {
        "cs": "Karas obecný",
        "en": "Crucian Carp"
    },
    "38": {
        "cs": "Limanda obecná",
        "en": "Dab"
    },
    "40": {
        "cs": "Jelec proudník",
        "en": "Common Dace"
    },
    "41": {
        "cs": "Kujaba brazilská",
        "en": "Golden Dorado"
    },
    "42": {
        "cs": "Úhoř",
        "en": "Eel"
    },
    "43": {
        "cs": "Hlaváč",
        "en": "Freshwater Goby"
    },
    "44": {
        "cs": "Kostlín",
        "en": "Gar"
    },
    "45": {
        "cs": "Hadohlavec červený",
        "en": "Giant Snakehead"
    },
    "46": {
        "cs": "Kapr zlatý",
        "en": "Goldcarp"
    },
    "47": {
        "cs": "Žralok kladivoun",
        "en": "Hammerhead Shark"
    },
    "48": {
        "cs": "Kranas obecný",
        "en": "Horse Mackerel"
    },
    "49": {
        "cs": "Losos čavyča",
        "en": "Chinook Salmon"
    },
    "50": {
        "cs": "Měsíčník svítivý",
        "en": "Ocean Sunfish"
    },
    "51": {
        "cs": "Okoun žlutý",
        "en": "Yellow Perch"
    },
    "52": {
        "cs": "Tuňák obecný",
        "en": "Atlantic Bluefin Tuna"
    },
    "54": {
        "cs": "Platýs velký",
        "en": "Olive Flounder"
    },
    "55": {
        "cs": "Zako japonský",
        "en": "Pale Chub"
    },
    "56": {
        "cs": "Koruška maloústá",
        "en": "Pond Smelt"
    },
    "57": {
        "cs": "Čtverzubec",
        "en": "Puffer Fish"
    },
    "58": {
        "cs": "Pstruh duhový",
        "en": "Rainbow Trout"
    },
    "59": {
        "cs": "Chňapal červený",
        "en": "Red Snapper"
    },
    "60": {
        "cs": "Losos obecný",
        "en": "Common Salmon"
    },
    "61": {
        "cs": "Mořčák evropský",
        "en": "Sea Bass"
    },
    "62": {
        "cs": "Žralok",
        "en": "Shark"
    },
    "63": {
        "cs": "Štika obecná",
        "en": "Pike"
    },
    "64": {
        "cs": "Cejn velký",
        "en": "Bream"
    },
    "65": {
        "cs": "Slunečnice malá",
        "en": "Orangespotted Sunfish"
    },
    "66": {
        "cs": "Lín obecný",
        "en": "Tench"
    },
    "67": {
        "cs": "Akara dvouskvrnná",
        "en": "Black Acara"
    },
    "68": {
        "cs": "Anténovec paranánský",
        "en": "Spotted Sorubim"
    },
    "69": {
        "cs": "Paúhoř elektrický",
        "en": "Electric Eel"
    },
    "70": {
        "cs": "Vějířovka černoploutvá",
        "en": "Blackfin Pearlfish"
    },
    "71": {
        "cs": "Úzkotlamka cejnovitá",
        "en": "Marbled Headstander"
    },
    "72": {
        "cs": "Hřebenáč paví",
        "en": "Pike Cichlid"
    },
    "73": {
        "cs": "Útesník pruhovaný",
        "en": "Sergeant Major"
    },
    "74": {
        "cs": "Havýš plástevný",
        "en": "Honeycomb Cowfish"
    },
    "75": {
        "cs": "Soltýn barakuda",
        "en": "Barracuda"
    },
    "76": {
        "cs": "Tarpon atlantský",
        "en": "Tarpon Atlantic"
    },
    "77": {
        "cs": "Kranas duhový",
        "en": "Rainbow Runner"
    },
    "80": {
        "cs": "Žabohlavec surinamský",
        "en": "Pacuma Toadfish"
    },
    "81": {
        "cs": "Vidlatka tuňákovitá",
        "en": "Leerfish"
    },
    "82": {
        "cs": "Kanic modroskvrnný",
        "en": "Coral Hind"
    },
    "83": {
        "cs": "Sardinka oblá",
        "en": "Sardinella"
    },
    "84": {
        "cs": "Vyza malá",
        "en": "Kaluga Sturgeon"
    },
    "85": {
        "cs": "Pomec modročelý",
        "en": "Queen Angelfish"
    },
    "86": {
        "cs": "Chrochtal modropásý",
        "en": "Blue Striped Grunt"
    },
    "87": {
        "cs": "Kanic bělopruhý",
        "en": "Nassau Grouper"
    },
    "88": {
        "cs": "Pomec černý",
        "en": "French Angelfish"
    },
    "89": {
        "cs": "Chňapal",
        "en": "Wenchman"
    },
    "90": {
        "cs": "Ostenec sargasový",
        "en": "Sargassum Triggerfish"
    },
    "91": {
        "cs": "Pyskoun perlový",
        "en": "Pearly Razorfish"
    },
    "92": {
        "cs": "Kranas mosazopruhý",
        "en": "Bigeye Scad"
    },
    "93": {
        "cs": "Křížovec dlouhoploutvý",
        "en": "Ariidae"
    },
    "94": {
        "cs": "Tlamovec Livingstonův",
        "en": "Livingston's Cichlid"
    },
    "95": {
        "cs": "Gurama velká",
        "en": "Giant Gourami"
    },
    "96": {
        "cs": "Arowana zlatá",
        "en": "Golden Arowana"
    },
    "97": {
        "cs": "Keříčkovec červenolemý",
        "en": "North African Catfish"
    },
    "98": {
        "cs": "Afrotetra Forskållova",
        "en": "Elongate Tigerfish"
    },
    "99": {
        "cs": "Rypoun úhořovitý",
        "en": "Cornish Jack"
    },
    "100": {
        "cs": "Tlamoun nilský",
        "en": "Nile Tilapia"
    },
    "101": {
        "cs": "Sumčík stříbřitý",
        "en": "African Butter Catfish"
    },
    "102": {
        "cs": "Klaun očkatý",
        "en": "Clownfish"
    },
    "105": {
        "cs": "Perlín ostrobřichý",
        "en": "Common Rudd"
    },
    "107": {
        "cs": "Robalo nilský",
        "en": "Nile Perch"
    },
    "108": {
        "cs": "Candát severoamerický",
        "en": "Walleye"
    },
    "109": {
        "cs": "Cichlida",
        "en": "Peacock Bass"
    },
    "110": {
        "cs": "Parma velkotlamá",
        "en": "Largemouth Yellowfish"
    },
    "111": {
        "cs": "Smuha chrochtavá",
        "en": "Freshwater Drum"
    },
    "112": {
        "cs": "Nožovec velký",
        "en": "Clown Featherback"
    },
    "113": {
        "cs": "Hrouzkovka skvrnoploutvá",
        "en": "Chinese False Gudgeon"
    },
    "114": {
        "cs": "Sekavec vepřorypý",
        "en": "Horseface Loach"
    },
    "115": {
        "cs": "Jeseter čínský",
        "en": "Chinese Sturgeon"
    },
    "116": {
        "cs": "Katla obecná",
        "en": "Catla"
    },
    "117": {
        "cs": "Rypoun zobanitý",
        "en": "Elephantfish"
    },
    "118": {
        "cs": "Leskyně skvrnitá",
        "en": "Opah"
    },
    "119": {
        "cs": "Tkaničnice stříbřitá",
        "en": "Silver Scabbardfish"
    },
    "120": {
        "cs": "Cípal pyskatý",
        "en": "Thicklip Grey Mullet"
    },
    "121": {
        "cs": "Sleď obecný",
        "en": "Atlantic Herring"
    },
    "122": {
        "cs": "Žralok psí",
        "en": "Tope Shark"
    },
    "123": {
        "cs": "Úhořovec mořský",
        "en": "European Conger"
    },
    "124": {
        "cs": "Ostnatec zmijí",
        "en": "Lesser Weever"
    },
    "125": {
        "cs": "Treska skvrnitá",
        "en": "Haddock"
    },
    "126": {
        "cs": "Mořan zlatý",
        "en": "Goldsilk Bream"
    },
    "127": {
        "cs": "Pasumec elektrický",
        "en": "Electric Catfish"
    },
    "128": {
        "cs": "Pstruh obecný",
        "en": "Brown Trout"
    },
    "129": {
        "cs": "Kostlín obrovský",
        "en": "Alligator Gar"
    },
    "130": {
        "cs": "Vlkouš obecný",
        "en": "Atlantic Wolffish"
    },
    "131": {
        "cs": "Kaprovec velkoústý",
        "en": "Bigmouth Buffalo"
    },
    "132": {
        "cs": "Lipan podhorní",
        "en": "Grayling"
    },
    "133": {
        "cs": "Pomčík ohnivý",
        "en": "Flame Angelfish"
    },
    "134": {
        "cs": "Paokoun zlatavý",
        "en": "Golden Perch"
    },
    "135": {
        "cs": "Binga tygří",
        "en": "Goliath Tigerfish"
    },
    "136": {
        "cs": "Piloun mnohozubý",
        "en": "Green Sawfish"
    },
    "137": {
        "cs": "Jeseter jezerní",
        "en": "Lake Sturgeon"
    },
    "138": {
        "cs": "Karas Lví hlava",
        "en": "Lionhead Goldfish"
    },
    "139": {
        "cs": "Paokoun mramorovaný",
        "en": "Murray Cod"
    },
    "140": {
        "cs": "Vrubozubec paví",
        "en": "Oscar"
    },
    "141": {
        "cs": "Kanic písmenkový",
        "en": "Painted Comber"
    },
    "142": {
        "cs": "Zubatice makrelová",
        "en": "Payara"
    },
    "143": {
        "cs": "Losos gorbuša",
        "en": "Pink Salmon"
    },
    "144": {
        "cs": "Plachetník širokoploutvý",
        "en": "Sailfish"
    },
    "145": {
        "cs": "Hlavačka",
        "en": "Sleepy Cod"
    },
    "146": {
        "cs": "Losos nerka",
        "en": "Sockeye Salmon"
    },
    "147": {
        "cs": "Ostnovec skvrnoocasý",
        "en": "Tailspot Ctenopoma"
    },
    "148": {
        "cs": "Piraňa rostlinožravá",
        "en": "Tambaqui"
    },
    "149": {
        "cs": "Ostnatec skvrnkovaný",
        "en": "Weever Fish"
    },
    "150": {
        "cs": "Pstruh aguabonita",
        "en": "Golden Trout"
    },
    "151": {
        "cs": "Siven americký",
        "en": "Brook Trout"
    },
    "152": {
        "cs": "Tygří ryba",
        "en": "Tiger Trout"
    },
    "154": {
        "cs": "Chobotnice pobřežní",
        "en": "Common Octopus"
    },
    "155": {
        "cs": "Rejnok říční",
        "en": "Occelate River Stingray"
    },
    "156": {
        "cs": "Vranka mnohoostná",
        "en": "Deepwater Sculpin"
    },
    "157": {
        "cs": "Amuřice Hoevenova",
        "en": "Mad Barb"
    },
    "158": {
        "cs": "Pilohřbetec malošupinatý",
        "en": "Siamese Tigerfish"
    },
    "159": {
        "cs": "Rejnok severní",
        "en": "Sailray"
    },
    "160": {
        "cs": "Platýs bradavičnatý",
        "en": "European Flounder"
    },
    "161": {
        "cs": "Blatňák menší",
        "en": "Eastern Mudminnow"
    },
    "162": {
        "cs": "Okoun říční",
        "en": "European Perch"
    },
    "164": {
        "cs": "Karas zlatý",
        "en": "Goldfish"
    },
    "165": {
        "cs": "Jelec tloušť",
        "en": "European Chub"
    },
    "166": {
        "cs": "Candát obecný",
        "en": "Zander"
    },
    "167": {
        "cs": "Sumeček černý",
        "en": "Black Bullhead"
    },
    "168": {
        "cs": "Strašík maloústý",
        "en": "Barreleye"
    },
    "169": {
        "cs": "Ropušnice malá",
        "en": "Red Scorpionfish"
    },
    "170": {
        "cs": "Siven malma",
        "en": "Dolly Varden"
    },
    "171": {
        "cs": "Krunýřovec guyanský",
        "en": "Suckermouth Catfish"
    },
    "172": {
        "cs": "Veslonos americký",
        "en": "Paddlefish"
    },
    "173": {
        "cs": "Perutýn ohnivý",
        "en": "Lionfish"
    },
    "174": {
        "cs": "Havýš hladký",
        "en": "Smooth Trunkfish"
    },
    "175": {
        "cs": "Ploskozubec duhový",
        "en": "Rainbow Parrotfish"
    },
    "176": {
        "cs": "Velkotlamec Johnsonův",
        "en": "Humpback Anglerfish"
    },
    "177": {
        "cs": "Pangas velký",
        "en": "Mekong Giant Catfish"
    },
    "179": {
        "cs": "Slunečnice červenooká",
        "en": "Rock Bass"
    },
    "180": {
        "cs": "Vřeténka mandarín",
        "en": "Mandarinfish"
    },
    "181": {
        "cs": "Okounek černý",
        "en": "Smallmouth Bass"
    },
    "182": {
        "cs": "Okounek tmavoskvrnný",
        "en": "Spotted Bass"
    },
    "183": {
        "cs": "Koryféna velká",
        "en": "Common Dolphinfish"
    },
    "184": {
        "cs": "Letoun středomořský",
        "en": "Flying Fish"
    },
    "185": {
        "cs": "Muréna jávská",
        "en": "Giant Moray"
    },
    "187": {
        "cs": "Sisora Yarrellova",
        "en": "Bagarius"
    },
    "188": {
        "cs": "Sekernatka drobná",
        "en": "Freshwater Hatchetfish"
    },
    "189": {
        "cs": "Okounek černoskvrnný",
        "en": "Black Crappy"
    },
    "190": {
        "cs": "Ouklej obecná",
        "en": "Common Bleak"
    },
    "191": {
        "cs": "Živorodka duhová",
        "en": "Guppy"
    },
    "192": {
        "cs": "Veleparma thajská",
        "en": "Giant Barb"
    },
    "193": {
        "cs": "Terčovec",
        "en": "Discus"
    },
    "194": {
        "cs": "Sumíček bajad",
        "en": "Bagrus Bajad"
    },
    "195": {
        "cs": "Kaprovec černý",
        "en": "Black Buffalo"
    },
    "196": {
        "cs": "Kančík citrónový",
        "en": "Midas Cichlid"
    },
    "197": {
        "cs": "Hlavatka obecná",
        "en": "Danube Salmon"
    },
    "198": {
        "cs": "Candátek modropásý",
        "en": "Rainbow Darter"
    },
    "199": {
        "cs": "Bahník východoafrický",
        "en": "Marbled Lungfish"
    },
    "200": {
        "cs": "Nožovec černý",
        "en": "African Knifefish"
    },
    "201": {
        "cs": "Mník jednovousý",
        "en": "Burbot"
    },
    "202": {
        "cs": "Trnovec černý",
        "en": "Ripsaw Catfish"
    },
    "203": {
        "cs": "Vandélie obecná",
        "en": "Vandellia"
    },
    "204": {
        "cs": "Štika muskalunga",
        "en": "Tiger Muskellunge"
    },
    "205": {
        "cs": "Žralok bělavý",
        "en": "Bull Shark"
    },
    "206": {
        "cs": "Trnucha thajská",
        "en": "Giant Freshwater Stingray"
    },
    "207": {
        "cs": "Kančík modroskvrnný",
        "en": "Texas Cichlid"
    },
    "208": {
        "cs": "Sumeček plochohlavý",
        "en": "Flathead Catfish"
    },
    "209": {
        "cs": "Siven velkohlavý",
        "en": "Bull Trout"
    },
    "210": {
        "cs": "Pstruh apačský",
        "en": "Apache Trout"
    },
    "211": {
        "cs": "Sumeček velký",
        "en": "Blue Catfish"
    },
    "212": {
        "cs": "Vranka pruhoploutvá",
        "en": "Alpine Bullhead"
    },
    "213": {
        "cs": "Drsek menší",
        "en": "Zingel Streber"
    },
    "214": {
        "cs": "Slunečnice pestrá",
        "en": "Pumpkinseed Sunfish"
    },
    "215": {
        "cs": "Vranka čtyřrohá",
        "en": "Fourhorned Sculpin"
    },
    "216": {
        "cs": "Razbora červenopruhá",
        "en": "Red-Striped Rasbora"
    },
    "217": {
        "cs": "Úzkotlamka nádherná",
        "en": "Striped Headstander"
    },
    "218": {
        "cs": "Halančík Gardnerův",
        "en": "Blue Lyretail"
    },
    "219": {
        "cs": "Trnovec hřebenočelý",
        "en": "Whitebarred Catfish"
    },
    "220": {
        "cs": "Sekavec příčnopásý",
        "en": "Kuhli Loach"
    },
    "221": {
        "cs": "Motýlkovec africký",
        "en": "Freshwater Butterflyfish"
    },
    "222": {
        "cs": "Hrotočelec ohnivý",
        "en": "Fire Eel"
    },
    "223": {
        "cs": "Ostnáč jednovousý",
        "en": "Amazon Leaf Fish"
    },
    "224": {
        "cs": "Kaproun obecný",
        "en": "Bowfin"
    },
    "225": {
        "cs": "Jeseter bílý",
        "en": "White Sturgeon"
    },
    "226": {
        "cs": "Hlavatka sibiřská",
        "en": "Hucho Taimen"
    },
    "227": {
        "cs": "Hlístoun červenohřívý",
        "en": "Giant Oarfish"
    },
    "228": {
        "cs": "Čtverzubec trpasličí",
        "en": "Dwarf Pufferfish"
    },
    "229": {
        "cs": "Duhovka",
        "en": "Rainbowfish"
    },
    "230": {
        "cs": "Pangas vláknoploutvý",
        "en": "Paroon Shark"
    },
    "231": {
        "cs": "Arowana dvojvousá",
        "en": "Silver Arowana"
    },
    "232": {
        "cs": "Arowana asijská",
        "en": "Asian Arowana"
    },
    "233": {
        "cs": "Bojovnice pestrá",
        "en": "Siamese Fighting Fish"
    },
    "234": {
        "cs": "Čtverzubec konžský",
        "en": "Congo Pufferfish"
    },
    "235": {
        "cs": "Čtverzubec baileyi",
        "en": "Hairy Pufferfish"
    },
    "236": {
        "cs": "Chaka indonéská",
        "en": "Chaca Chaca Catfish"
    },
    "237": {
        "cs": "Žabohlavec trojtrnný",
        "en": "Freshwater Lionfish"
    },
    "238": {
        "cs": "Žralok sedmižábrý",
        "en": "Sharpnose Sevengill Shark"
    },
    "239": {
        "cs": "Žralok límcový",
        "en": "Frilled Shark"
    },
    "240": {
        "cs": "Žralok trnitý",
        "en": "Bramble Shark"
    },
    "241": {
        "cs": "Ostroun obecný",
        "en": "Dogfish Shark"
    },
    "242": {
        "cs": "Žralok Cookeův",
        "en": "Prickly Shark"
    },
    "243": {
        "cs": "Polorejnok",
        "en": "Angel Shark"
    },
    "244": {
        "cs": "Různozubec Francisův",
        "en": "Horn Shark"
    },
    "245": {
        "cs": "Wobegong skvrnitý",
        "en": "Spotted Wobbegong"
    },
    "246": {
        "cs": "Žralok zebrovitý",
        "en": "Zebra Shark"
    },
    "247": {
        "cs": "Žralok vouskatý",
        "en": "Nurse Shark"
    },
    "248": {
        "cs": "Žralok obrovský",
        "en": "Whale Shark"
    },
    "249": {
        "cs": "Vousatec Smithův",
        "en": "Barbeled Houndshark"
    },
    "250": {
        "cs": "Pruhoun novozélandský",
        "en": "Gollumshark"
    },
    "251": {
        "cs": "Máčka korálová",
        "en": "Coral Catshark"
    },
    "252": {
        "cs": "Žralok modrý",
        "en": "Blue Shark"
    },
    "253": {
        "cs": "Žralok tygří",
        "en": "Tiger Shark"
    },
    "254": {
        "cs": "Žralok šotek",
        "en": "Goblin Shark"
    },
    "255": {
        "cs": "Žralok veliký",
        "en": "Basking Shark"
    },
    "256": {
        "cs": "Žralok velkoústý",
        "en": "Megamouth Shark"
    },
    "257": {
        "cs": "Liškoun obecný",
        "en": "Thresher Shark"
    },
    "258": {
        "cs": "Žralok východní",
        "en": "Longfin Mako Shark"
    },
    "259": {
        "cs": "Žralok bílý",
        "en": "Great White Shark"
    },
    "260": {
        "cs": "Siven obří",
        "en": "Lake Trout"
    },
    "261": {
        "cs": "Veslonos čínský",
        "en": "Chinese Paddlefish"
    },
    "262": {
        "cs": "Sumec albín",
        "en": "Albino Catfish"
    },
    "263": {
        "cs": "Tolstolobik bílý",
        "en": "Silver Carp"
    },
    "264": {
        "cs": "Bahník americký",
        "en": "South American Lungfish"
    },
    "265": {
        "cs": "Pyskoun skvrnitý",
        "en": "Ballan Wrasse"
    },
    "266": {
        "cs": "Kytarovec křivoústý",
        "en": "Bowmouth Guitarfish"
    },
    "267": {
        "cs": "Kanic obrovský",
        "en": "Giant Grouper"
    },
    "268": {
        "cs": "Platýs tichomořský",
        "en": "Halibut"
    },
    "269": {
        "cs": "Ploskozubec vysokočelý",
        "en": "Humphead Parrotfish"
    },
    "270": {
        "cs": "Udicovka tasmánská",
        "en": "Spotted Handfish"
    },
    "271": {
        "cs": "Řasovník rozedraný",
        "en": "Leafy Seadragon"
    },
    "272": {
        "cs": "Muréna obecná",
        "en": "Muraena Augusti"
    },
    "273": {
        "cs": "Jeseter perský",
        "en": "Persian Sturgeon"
    },
    "274": {
        "cs": "Ostenec chřestivý",
        "en": "Queen Triggerfish"
    },
    "275": {
        "cs": "Jeseter hvězdnatý",
        "en": "Starry Sturgeon"
    },
    "276": {
        "cs": "Jeseter velký",
        "en": "European Sea Sturgeon"
    },
    "277": {
        "cs": "Arowana zlatá červenoocasá",
        "en": "Red-Tail Golden Arowana"
    },
    "278": {
        "cs": "Arowana černá",
        "en": "Black Arowana"
    },
    "279": {
        "cs": "Fantang nilský",
        "en": "African Arowana"
    },
    "280": {
        "cs": "Zelená arowana",
        "en": "Green Arowana"
    },
    "281": {
        "cs": "Zeleno-červená arowana",
        "en": "Green Red Arowana"
    },
    "282": {
        "cs": "Arowana žlutoocasá",
        "en": "Yellow-Tail Arowana"
    },
    "283": {
        "cs": "Baramundi malajský",
        "en": "Asian Green Arowana"
    },
    "284": {
        "cs": "Arowana platinová",
        "en": "Platinum Golden Arowana"
    },
    "285": {
        "cs": "Baramundi severní",
        "en": "Jardini Arowana"
    },
    "286": {
        "cs": "Arowana modrá",
        "en": "Blue Malayan Arowana"
    },
    "287": {
        "cs": "Piraňa plodožravá",
        "en": "Red Bellied Pacu"
    },
    "300": {
        "cs": "Pachiméra sagamská",
        "en": "Long-nosed Chimaera"
    },
    "301": {
        "cs": "Štítovec krátkoploutvý",
        "en": "Spearfish Remora"
    },
    "302": {
        "cs": "Pilníkotrn velký",
        "en": "Scrawled Filefish"
    },
    "303": {
        "cs": "Okouník černopásý",
        "en": "Treefish"
    },
    "304": {
        "cs": "Muréna nosatá",
        "en": "RibbonEel"
    },
    "305": {
        "cs": "Manta obrovská",
        "en": "Giant Oceanic Manta Ray"
    },
    "306": {
        "cs": "Lopatonos alabamský",
        "en": "Alabama Sturgeon"
    },
    "307": {
        "cs": "Krakatice obrovská",
        "en": "Giant Squid"
    },
    "308": {
        "cs": "Mečoun obecný",
        "en": "Swordfish"
    },
    "309": {
        "cs": "Gyrodus",
        "en": "Gyrodus"
    },
    "310": {
        "cs": "Acanthodes",
        "en": "Acanthodes"
    },
    "311": {
        "cs": "Antiarchi",
        "en": "Antiarchi"
    },
    "312": {
        "cs": "Dunkleosteus",
        "en": "Dunkleosteus"
    },
    "313": {
        "cs": "Xiphactinus",
        "en": "Xiphactinus"
    },
    "314": {
        "cs": "Titanichthys",
        "en": "Titanichthys"
    },
    "315": {
        "cs": "Thelodus",
        "en": "Thelodus"
    },
    "316": {
        "cs": "Osteolepis",
        "en": "Osteolepis"
    },
    "317": {
        "cs": "Pteraspis",
        "en": "Pteraspis"
    },
    "318": {
        "cs": "Platysomus",
        "en": "Platysomus"
    },
    "319": {
        "cs": "Cheirolepis",
        "en": "Cheirolepis"
    },
    "320": {
        "cs": "Materpiscis",
        "en": "Materpiscis"
    },
    "321": {
        "cs": "Macropoma",
        "en": "Macropoma"
    },
    "322": {
        "cs": "Leedsichthys",
        "en": "Leedsichthys"
    },
    "323": {
        "cs": "Hyneria",
        "en": "Hyneria"
    },
    "324": {
        "cs": "Helicoprion",
        "en": "Helicoprion"
    },
    "325": {
        "cs": "Megalodon",
        "en": "Megalodon"
    },
    "326": {
        "cs": "Arandaspis",
        "en": "Arandaspis"
    },
    "327": {
        "cs": "Aspidorhynchus",
        "en": "Aspidorhynchus"
    },
    "328": {
        "cs": "Cladoselache",
        "en": "Cladoselache"
    },
    "329": {
        "cs": "Cheiracanthus",
        "en": "Cheiracanthus"
    },
    "330": {
        "cs": "Cobelodus",
        "en": "Cobelodus"
    },
    "331": {
        "cs": "Coccosteus",
        "en": "Coccosteus"
    },
    "332": {
        "cs": "Dapedium",
        "en": "Dapedium"
    },
    "333": {
        "cs": "Drepanaspis",
        "en": "Drepanaspis"
    },
    "334": {
        "cs": "Enchodus",
        "en": "Enchodus"
    },
    "335": {
        "cs": "Gyrosteus",
        "en": "Gyrosteus"
    },
    "336": {
        "cs": "Moythomasia",
        "en": "Moythomasia"
    },
    "337": {
        "cs": "Orthacanthus",
        "en": "Orthacanthus"
    },
    "338": {
        "cs": "Pharyngolepis",
        "en": "Pharyngolepis"
    },
    "339": {
        "cs": "Pikaia",
        "en": "Pikaia"
    },
    "340": {
        "cs": "Saurichthys",
        "en": "Saurichthys"
    },
    "341": {
        "cs": "Semionotus",
        "en": "Semionotus"
    },
    "342": {
        "cs": "Stethacanthus",
        "en": "Stethacanthus"
    },
    "343": {
        "cs": "Xenacanthus",
        "en": "Xenacanthus"
    },
    "400": {
        "cs": "Bodlok pestrý",
        "en": "Blue Tang"
    },
    "401": {
        "cs": "Pyskoun korunkatý",
        "en": "Hogfish"
    },
    "402": {
        "cs": "Trubkotlamka skvrnitá",
        "en": "Trumpetfish"
    },
    "403": {
        "cs": "Kněžík dvoupruhý",
        "en": "Bluehead Wrasse"
    },
    "404": {
        "cs": "Ostnatec ryšavý",
        "en": "Spanish Hogfish"
    },
    "405": {
        "cs": "Ploskozubec královský",
        "en": "Queen Parrotfish"
    },
    "406": {
        "cs": "Pruhatec černopruhý",
        "en": "Blackbar Soldierfish"
    },
    "407": {
        "cs": "Štíhlice písečná",
        "en": "Sand Tilefish"
    },
    "408": {
        "cs": "Kněžík Garnotův",
        "en": "Yellowhead Wrasse"
    },
    "409": {
        "cs": "Očař noční",
        "en": "Glasseye Snapper"
    },
    "410": {
        "cs": "Bodlok žlutý",
        "en": "Yellow Tang"
    },
    "411": {
        "cs": "Jednotrn vlajkoocasý",
        "en": "Fantail Filefish"
    },
    "412": {
        "cs": "Kanic tmavý",
        "en": "Blue-spotted Grouper"
    },
    "413": {
        "cs": "Akilolo zelený",
        "en": "Bird Wrasse"
    },
    "414": {
        "cs": "Bičonoš zobanovitý",
        "en": "Moorish Idol"
    },
    "415": {
        "cs": "Klipka žlutopruhá",
        "en": "Ornate Butterflyfish"
    },
    "416": {
        "cs": "Ploskozubec modrý",
        "en": "Blue Parrotfish"
    },
    "417": {
        "cs": "Ostenec Picassův",
        "en": "Picasso Triggerfish"
    },
    "418": {
        "cs": "Kněžík žlutoocasý",
        "en": "Yellowtail Wrasse"
    },
    "419": {
        "cs": "Ostenec vdova",
        "en": "Pinktail Triggerfish"
    },
    "420": {
        "cs": "Tloušťovka bermudská",
        "en": "Bermuda Chub"
    },
    "421": {
        "cs": "Klipka příčnopruhá",
        "en": "Banded Butterflyfish"
    },
    "422": {
        "cs": "Kambala tropická",
        "en": "Peacock Flounder"
    },
    "423": {
        "cs": "Pomec tříbarevný",
        "en": "Rock Beauty"
    },
    "424": {
        "cs": "Siba skvrnitá",
        "en": "Spotted Eagle Ray"
    },
    "425": {
        "cs": "Oliheň Lessonova",
        "en": "Bigfin Reef Squid"
    },
    "426": {
        "cs": "Ploskozubec půlnoční",
        "en": "Midnight Parrotfish"
    },
    "427": {
        "cs": "Vidlatka palometa",
        "en": "Palometa"
    },
    "428": {
        "cs": "Ostenec zelenavý",
        "en": "Titan Triggerfish"
    },
    "429": {
        "cs": "Chňapal modropruhý",
        "en": "Bluestripe Snapper"
    },
    "430": {
        "cs": "Klipka fantomová",
        "en": "Phantom Bannerfish"
    },
    "431": {
        "cs": "Žralok dlouhoploutvý",
        "en": "Oceanic Whitetip Shark"
    },
    "432": {
        "cs": "Žralok hnědý",
        "en": "Sandbar Shark"
    },
    "433": {
        "cs": "Žralok západoaustralský",
        "en": "Spot-tail Shark"
    },
    "434": {
        "cs": "Žraloček brazilský",
        "en": "Cookiecutter Shark"
    },
    "435": {
        "cs": "Žralok citronový",
        "en": "Lemon Shark"
    },
    "436": {
        "cs": "Žralok ostrý",
        "en": "Milk Shark"
    },
    "437": {
        "cs": "Chřestivec Darwinův",
        "en": "Red-lipped batfish"
    },
    "438": {
        "cs": "Jehla pruhovaná",
        "en": "Orange-Banded Pipefish"
    },
    "439": {
        "cs": "Bodlok jednorohý",
        "en": "Bluespine Unicornfish"
    },
    "440": {
        "cs": "Světloun Carterův",
        "en": "Cylindrical lanternshark"
    },
    "441": {
        "cs": "Kněžík šachovnicovitý",
        "en": "Checkerboard Wrasse"
    },
    "442": {
        "cs": "Kanic tygří",
        "en": "Tiger Grouper"
    },
    "443": {
        "cs": "Kanícek fialovožlutý",
        "en": "Fairy Basslet"
    },
    "444": {
        "cs": "Kanic hřbetoskvrnný",
        "en": "Graysby"
    },
    "445": {
        "cs": "Klipka žlutá",
        "en": "Longnose Butterfly"
    },
    "446": {
        "cs": "Kranas modroploutvý",
        "en": "Bluefin Trevally"
    },
    "447": {
        "cs": "Pilníkotrn nejmenší",
        "en": "Minute Leatherjacket"
    },
    "448": {
        "cs": "Komorník havajský",
        "en": "White-Spotted Damsel"
    },
    "449": {
        "cs": "Klipka hrotcová",
        "en": "Pennant Coralfish"
    },
    "450": {
        "cs": "Bodianus diplotaenia",
        "en": "Mexican Hogfish"
    },
    "451": {
        "cs": "Havýš běloskvrnný",
        "en": "Whitespotted boxfish"
    },
    "452": {
        "cs": "Ostenec bělolemý",
        "en": "Black Triggerfish"
    },
    "453": {
        "cs": "Pomec prstenčitý",
        "en": "Blue Ring Angelfish"
    },
    "454": {
        "cs": "Halančíkovec ďábelský",
        "en": "Devils Hole Pupfish"
    },
    "455": {
        "cs": "Anténovec červenoocasý",
        "en": "Redtail Catfish"
    },
    "456": {
        "cs": "Kohoutovec dlouhoploutvý",
        "en": "Roosterfish"
    },
    "500": {
        "cs": "Muréna zebrovaná",
        "en": "Zebra Moray"
    },
    "501": {
        "cs": "Muréna hvězdovitá",
        "en": "Snowflake Moray"
    },
    "502": {
        "cs": "Muréna zelenavá",
        "en": "Green Moray"
    },
    "503": {
        "cs": "Muréna poskvrněná",
        "en": "Spotted Moray"
    },
    "504": {
        "cs": "Muréna žlutolemá",
        "en": "Yellowmargin Moray"
    },
    "505": {
        "cs": "Muréna leopardí",
        "en": "Leopard Moray"
    },
    "506": {
        "cs": "Muréna žlutoocasá",
        "en": "Goldentail Moray"
    },
    "507": {
        "cs": "Muréna žlutotlamá",
        "en": "Yellow-mouth Moray"
    },
    "508": {
        "cs": "Muréna tygrovitá",
        "en": "Fangtooth Moray"
    },
    "509": {
        "cs": "Muréna pestrá",
        "en": "Paint-Spotted Moray"
    },
    "510": {
        "cs": "Muréna běloústá",
        "en": "Whitemouth Moray"
    },
    "511": {
        "cs": "Muréna pardálí",
        "en": "Dragon Moray"
    },
    "512": {
        "cs": "Muréna řetízková",
        "en": "Chain Moray"
    },
    "513": {
        "cs": "Muréna Breedenova",
        "en": "Blackcheek Moray"
    },
    "514": {
        "cs": "Muréna psí",
        "en": "Viper Moray"
    },
    "515": {
        "cs": "Muréna žlutohlavá",
        "en": "Yellowhead Moray"
    },
    "516": {
        "cs": "Muréna bělooká",
        "en": "White-Eyed Moray"
    },
    "517": {
        "cs": "Salpa Maggiore",
        "en": "Salpa Maggiore"
    },
    "518": {
        "cs": "Chrochtal žlutopruhý",
        "en": "French Grunt"
    },
    "519": {
        "cs": "Kanic tygrovaný",
        "en": "Harlequin Bass"
    },
    "520": {
        "cs": "Chňapal žlutoploutvý",
        "en": "Schoolmaster Snapper"
    },
    "521": {
        "cs": "Ještěrohlavec prostřední",
        "en": "Sand Diver"
    },
    "522": {
        "cs": "Chrochtal prasečí",
        "en": "Porkfish"
    },
    "523": {
        "cs": "Rozedranec červenoskvrnný",
        "en": "Clown Frogfish"
    },
    "524": {
        "cs": "Pyskoun dlouhoploutvý",
        "en": "Broomtail Wrasse"
    },
    "525": {
        "cs": "Kapr lysec",
        "en": "Mirror Carp"
    },
    "526": {
        "cs": "Losos kisuč",
        "en": "Coho Salmon"
    },
    "527": {
        "cs": "Úhoř novozélandský",
        "en": "Long-finned Eel"
    },
    "528": {
        "cs": "Kostlín albín",
        "en": "Albino Alligator Gar"
    },
    "529": {
        "cs": "Úhoř japonský",
        "en": "Japanese Eel"
    },
    "530": {
        "cs": "Hybridní mořčák pruhovaný",
        "en": "Hybrid Striped Bass"
    },
    "531": {
        "cs": "Mořčák stříbřitý",
        "en": "White Bass"
    },
    "532": {
        "cs": "Mořčák pruhovaný",
        "en": "Striped Bass"
    },
    "533": {
        "cs": "Dlouhonos třásnitý",
        "en": "Long-snouted Lancetfish"
    },
    "600": {
        "cs": "Amur bílý",
        "en": "Grass Carp"
    },
    "601": {
        "cs": "Tolstolobec pestrý",
        "en": "Bighead Carp"
    },
    "602": {
        "cs": "Příčnoústka čtyřvousá",
        "en": "Mrigal Carp"
    },
    "603": {
        "cs": "Labeo černé",
        "en": "Black Sharkminnow"
    },
    "604": {
        "cs": "Jehlice lagunová",
        "en": "Atlantic Needlefish"
    },
    "605": {
        "cs": "Krunýřovec",
        "en": "Gold Nugget Pleco"
    },
    "606": {
        "cs": "Bichir senegalský",
        "en": "Senegal Bichir"
    },
    "607": {
        "cs": "Anténovec vláknovitý",
        "en": "Piraíba Catfish"
    },
    "608": {
        "cs": "Čtverzubec mbu",
        "en": "Mbu Pufferfish"
    },
    "609": {
        "cs": "Nožovka běločelá",
        "en": "Black Ghost Knifefish"
    },
    "610": {
        "cs": "Krunýřovec zebra",
        "en": "Zebra Pleco"
    },
    "611": {
        "cs": "Panceřníček Juliin",
        "en": "Corydoras Julii"
    },
    "612": {
        "cs": "Polozobánka malajská",
        "en": "Wrestling Halfbeak"
    },
    "613": {
        "cs": "Štika amurská",
        "en": "Amur Pike"
    },
    "614": {
        "cs": "Aju východní",
        "en": "Ayu"
    },
    "615": {
        "cs": "Sekavka nádherná",
        "en": "Clown Loach"
    },
    "616": {
        "cs": "Piloun mikrodon",
        "en": "Largetooth Sawfish"
    },
    "617": {
        "cs": "Živorodka ostrotlamá",
        "en": "Black Molly"
    },
    "618": {
        "cs": "Okounek světlý",
        "en": "White Crappie"
    },
    "619": {
        "cs": "Panchax prstencový",
        "en": "Clown Killi"
    },
    "620": {
        "cs": "Tlamovec čelnatý",
        "en": "Frontosa Cichlid"
    },
    "621": {
        "cs": "Hrotočelec ozbrojený",
        "en": "Tire Track Eel"
    },
    "700": {
        "cs": "Žralok kyklop",
        "en": "Cyclops Shark"
    },
    "701": {
        "cs": "Šírotlamka pelikánovitá",
        "en": "Pelican Eel"
    },
    "702": {
        "cs": "Tupohlavec Rosenův",
        "en": "Meadia Roseni"
    },
    "703": {
        "cs": "Sliznatá ryba",
        "en": "Blobfish"
    },
    "704": {
        "cs": "Ďas mořský",
        "en": "Angler Monkfish"
    },
    "705": {
        "cs": "Svítivec",
        "en": "Stareater"
    },
    "706": {
        "cs": "Neoclinus blanchardi",
        "en": "Sarcastic Fringehead"
    },
    "707": {
        "cs": "Čtverzubec běloskvrnný",
        "en": "White-spotted Puffer"
    },
    "708": {
        "cs": "Králíčkovec zlatoskvrnný",
        "en": "Gold-spotted Rabbitfish"
    },
    "709": {
        "cs": "Klaun uzdičkatý",
        "en": "Tomato Clownfish"
    },
    "710": {
        "cs": "Sapín zelený",
        "en": "Blue-Green Chromis"
    },
    "711": {
        "cs": "Pomčík Potterův",
        "en": "Potter's Angelfish"
    },
    "712": {
        "cs": "Pilohřbet jihoaustralský",
        "en": "Fiddler Ray"
    },
    "713": {
        "cs": "Havýš rohatý",
        "en": "Longhorn Cowfish"
    },
    "714": {
        "cs": "Kněžík duhový",
        "en": "Cortez Rainbow Wrasse"
    },
    "715": {
        "cs": "Pásovka černá",
        "en": "Black Dragonfish"
    },
    "716": {
        "cs": "Channa aurantimaculata",
        "en": "Orange-spotted Snakehead"
    },
    "717": {
        "cs": "Štika americká červenoploutvá",
        "en": "Redfin Pickerel"
    },
    "718": {
        "cs": "Štika americká",
        "en": "Grass Pickerel"
    },
    "719": {
        "cs": "Štika zlatá",
        "en": "Golden Pike"
    },
    "720": {
        "cs": "Tlamovec Thomasův",
        "en": "Butterfly Cichlid"
    },
    "721": {
        "cs": "Kanic tečkovaný",
        "en": "Panther Grouper"
    },
    "722": {
        "cs": "Jehlice krokodýlí",
        "en": "Hound Needlefish"
    },
    "723": {
        "cs": "Chanos stříbřitý",
        "en": "Milkfish"
    },
    "724": {
        "cs": "Pilonos vouskatý",
        "en": "Longnose Sawshark"
    },
    "725": {
        "cs": "Cichlida plochohlavá",
        "en": "Malawi Eye Biter"
    },
    "726": {
        "cs": "Řasovník protáhlý",
        "en": "Weedy Seadragon"
    },
    "727": {
        "cs": "Okouníček sklovitý",
        "en": "Indian Glass Fish"
    },
    "728": {
        "cs": "Chimérovka tasmánská",
        "en": "Australian Ghostshark"
    },
    "729": {
        "cs": "Netopýrník hrbohlavý",
        "en": "Humpback Batfish"
    },
    "730": {
        "cs": "Pyskoun třásniploutvý",
        "en": "Dragon Wrasse"
    },
    "731": {
        "cs": "Vlajkovka červenavá",
        "en": "Red Indianfish"
    },
    "732": {
        "cs": "Ještěrohlavec hlubokomořský",
        "en": "Deepsea Lizardfish"
    },
    "733": {
        "cs": "Kostlín černý",
        "en": "Black Alligator Gar"
    },
    "734": {
        "cs": "Chrochtal východní",
        "en": "Oriental Sweetlips"
    },
    "735": {
        "cs": "Hlaváčovec nádherný",
        "en": "Elegant Firefish"
    },
    "736": {
        "cs": "Klipka krokvicová",
        "en": "Chevron Butterflyfish"
    },
    "737": {
        "cs": "Pomčík citronový",
        "en": "Lemonpeel Angelfish"
    },
    "738": {
        "cs": "Čtverzubec lysý",
        "en": "Ocellated Pufferfish"
    },
    "739": {
        "cs": "Plošák stříbřitý",
        "en": "Common Ponyfish "
    },
    "740": {
        "cs": "Neonka obecná",
        "en": "Neon Tetra"
    },
    "741": {
        "cs": "Perleťovka démon",
        "en": "Satanoperca"
    },
    "742": {
        "cs": "Dánio duhové",
        "en": "Pearl Danio"
    },
    "743": {
        "cs": "Galaxie velká",
        "en": "Giant Kokopu"
    },
    "744": {
        "cs": "Jeseter amurský",
        "en": "Amur Sturgeon"
    },
    "745": {
        "cs": "Manta velká",
        "en": "Giant Devil Ray"
    },
    "746": {
        "cs": "Ploskozubec zelenozubý",
        "en": "Rusty Parrotfish"
    },
    "747": {
        "cs": "Pomec císařský",
        "en": "Emperor Angelfish"
    },
    "748": {
        "cs": "Vějířník třásnitý",
        "en": "Ornate Ghost Pipefish"
    },
    "749": {
        "cs": "Různozubec přilbovitý",
        "en": "Crested Bullhead Shark"
    },
    "750": {
        "cs": "Rozedranec pestrý",
        "en": "Pink Frogfish"
    },
    "751": {
        "cs": "Trnonoš australský",
        "en": "Pineapplefish"
    },
    "752": {
        "cs": "Oblohlav divukrásný",
        "en": "Marine Betta"
    },
    "753": {
        "cs": "Lampař severní",
        "en": "Northern Lampfish"
    },
    "754": {
        "cs": "Kněžík srpkovitý",
        "en": "Moon Wrasse"
    },
    "755": {
        "cs": "Štětičkovec obecný",
        "en": "Longnose Hawkfish"
    },
    "756": {
        "cs": "Havýš žlutohnědý",
        "en": "Yellow Boxfish"
    },
    "757": {
        "cs": "Bodlok Achillův",
        "en": "Achilles Tang"
    },
    "758": {
        "cs": "Jeseter jihočínský",
        "en": "Yangtze Sturgeon"
    },
    "759": {
        "cs": "Pardachirus morrowi",
        "en": "Persian Carpet Sole"
    },
    "760": {
        "cs": "Chňapal císařský",
        "en": "Emperor Red Snapper"
    },
    "761": {
        "cs": "Čtverzubec ostnatý",
        "en": "Basketfish"
    },
    "762": {
        "cs": "Hlaváč červenopruhý",
        "en": "Red-striped Goby"
    },
    "763": {
        "cs": "Jeseter sibiřský",
        "en": "Siberian Sturgeon"
    },
    "764": {
        "cs": "Jeseter krátkorypý",
        "en": "Shortnose Sturgeon"
    },
    "765": {
        "cs": "Kostlín floridský",
        "en": "Florida Gar"
    },
    "800": {
        "cs": "Tuňák žlutoploutvý",
        "en": "Yellowfin Tuna"
    },
    "801": {
        "cs": "Tuňák velkooký",
        "en": "Bigeye Tuna"
    },
    "802": {
        "cs": "Tuňák tichomořský",
        "en": "Pacific Bluefin Tuna"
    },
    "803": {
        "cs": "Marlín černý",
        "en": "Black Marlin"
    },
    "804": {
        "cs": "Marlín pruhovaný",
        "en": "Striped Marlin"
    },
    "805": {
        "cs": "Marlín bílý",
        "en": "White Marlin"
    },
    "806": {
        "cs": "Soltýn ostroploutvý",
        "en": "Sharpfin Barracuda"
    },
    "807": {
        "cs": "Soltýn pelikání",
        "en": "Pelican Barracuda"
    },
    "808": {
        "cs": "Soltýn žlutoocasý",
        "en": "Yellowtail Barracuda"
    },
    "809": {
        "cs": "Soltýn velkooký",
        "en": "Bigeye Barracuda"
    },
    "810": {
        "cs": "Kostlín skvrnitý",
        "en": "Spotted Gar"
    },
    "811": {
        "cs": "Bojovnice Brownových",
        "en": "Betta Brownorum"
    },
    "812": {
        "cs": "Halančíkovec slaništní",
        "en": "Death Valley Pupfish"
    },
    "813": {
        "cs": "Štikovka skvrnitá",
        "en": "Spotted Pike-characin"
    },
    "814": {
        "cs": "Hlaváč Griessingerův",
        "en": "Spikefin Goby"
    },
    "815": {
        "cs": "Soltýn stříbřitý",
        "en": "Pacific Barracuda"
    },
    "816": {
        "cs": "Soltýn pobřežní",
        "en": "Guachanche Barracuda"
    },
    "817": {
        "cs": "Soltýn Hellerův",
        "en": "Heller's Barracuda"
    },
    "818": {
        "cs": "Soltýn tmavopruhý",
        "en": "Pickhandle Barracuda"
    },
    "819": {
        "cs": "Soltýn Australský",
        "en": "Australian Barracuda"
    },
    "1000": {
        "cs": "Žralok grónský",
        "en": "Greenland Shark"
    },
    "1001": {
        "cs": "Piloun malozubý",
        "en": "Smalltooth Sawfish"
    },
    "1002": {
        "cs": "Piloun obecný",
        "en": "Common Sawfish"
    },
    "1003": {
        "cs": "Lesklec africký",
        "en": "Spotted Sicklefish"
    },
    "1004": {
        "cs": "Hrdložábřík bělavý",
        "en": "Blind Cave Eel"
    },
    "1005": {
        "cs": "Kranas zlatý",
        "en": "Golden Trevally"
    },
    "1006": {
        "cs": "Kladivoun tiburo",
        "en": "Bonnethead Shark"
    },
    "1007": {
        "cs": "Kladivoun křídlohlavý",
        "en": "Winghead Shark"
    },
    "1008": {
        "cs": "Noční poutník",
        "en": "Blue-bellied Night Wanderer"
    },
    "1009": {
        "cs": "Medúzovec okounovitý",
        "en": "American Barrelfish"
    },
    "1010": {
        "cs": "Rypoun vidlozubý",
        "en": "Marcusenius Furcidens"
    },
    "1011": {
        "cs": "Tetra Sweglesova",
        "en": "Red Phantom Tetra"
    },
    "1012": {
        "cs": "Cichlida madagaskarská",
        "en": "Black Diamond Cichlid"
    },
    "1013": {
        "cs": "Piraňa tmavá",
        "en": "Piraya"
    },
    "1014": {
        "cs": "Vějířovka příčnopruhá",
        "en": "Austrolebias Adloffi"
    },
    "1100": {
        "cs": "Kanic cukrový",
        "en": "Candy Basslet"
    },
    "1101": {
        "cs": "Kanic oranžovoskvrnný",
        "en": "Orangespotted Soapfish"
    },
    "1102": {
        "cs": "Kanic křiklavý",
        "en": "Garish Hind"
    },
    "1103": {
        "cs": "Pomec maskový",
        "en": "Masked Angelfish"
    },
    "1104": {
        "cs": "Pomčík Boyleův",
        "en": "Peppermint Angelfish"
    },
    "1105": {
        "cs": "Tuňák křídlatý",
        "en": "Albacore Tuna"
    },
    "1106": {
        "cs": "Tuňák australský",
        "en": "Southern Bluefin Tuna"
    },
    "1107": {
        "cs": "Tuňák atlantský",
        "en": "Blackfin Tuna"
    },
    "1108": {
        "cs": "Tuňák dlouhoocasý",
        "en": "Longtail Tuna"
    },
    "1109": {
        "cs": "Tuňák malý",
        "en": "Bullet Tuna"
    },
    "1110": {
        "cs": "Hlubinář",
        "en": "Aphyonidae"
    },
    "1111": {
        "cs": "Ipnops",
        "en": "Grideye Fish"
    },
    "1112": {
        "cs": "Tlamovec sprengerae",
        "en": "Lavender Mbuna"
    },
    "1113": {
        "cs": "Dánio jayarami",
        "en": "Inlecypris Jayarami"
    },
    "1114": {
        "cs": "Rypoun západoafrický",
        "en": "Isichthys Henryi"
    },
    "1115": {
        "cs": "Slimule bělopruhá",
        "en": "Whitebar Eelpout"
    },
    "1116": {
        "cs": "Hlaváčovec černoploutvý",
        "en": "Blackfin Dartfish"
    },
    "1117": {
        "cs": "Terčovka Beckerova",
        "en": "Gloved Snailfish"
    },
    "1118": {
        "cs": "Sekavec sabažský",
        "en": "Pangio Mariarum"
    },
    "1119": {
        "cs": "Pakaprovec ostrohřbetý",
        "en": "Razorback Sucker"
    },
    "1120": {
        "cs": "Křížovec panamský",
        "en": "Chilhuil Sea Catfish"
    },
    "1121": {
        "cs": "Ostroretka stěhovavá",
        "en": "Common Nase"
    },
    "1122": {
        "cs": "Plotice obecná",
        "en": "Common Roach"
    },
    "1123": {
        "cs": "Střevle potoční",
        "en": "Common Minnow"
    },
    "1124": {
        "cs": "Makrela obecná",
        "en": "Atlantic Mackerel"
    },
    "1125": {
        "cs": "Sardel obecná",
        "en": "European Anchovy"
    },
    "1126": {
        "cs": "Šprot obecný",
        "en": "European Sprat"
    },
    "1127": {
        "cs": "Ježdík obecný",
        "en": "Eurasian Ruffe"
    },
    "1128": {
        "cs": "Síh peleď",
        "en": "Peled"
    },
    "1129": {
        "cs": "Skalára amazonská",
        "en": "Freshwater Angelfish"
    },
    "1130": {
        "cs": "Koljuška tříostná",
        "en": "Three-spined Stickleback"
    },
    "1131": {
        "cs": "Řasovník rubínový",
        "en": "Ruby Seadragon"
    },
    "1132": {
        "cs": "Lates stříbřitý",
        "en": "Barramundi"
    },
    "1133": {
        "cs": "Parachaenichthys charcoti",
        "en": "Parachaenichthys charcoti"
    },
    "1134": {
        "cs": "Žralok krátkoploutvý",
        "en": "Spinner Shark"
    },
    "1135": {
        "cs": "Žralok černoploutvý",
        "en": "Blacktip Reef Shark"
    },
    "1136": {
        "cs": "Světloun Bonnaterrův",
        "en": "Kitefin Shark"
    },
    "1137": {
        "cs": "Žralůček indonéský",
        "en": "Indonesian Speckled Carpetshark"
    },
    "1138": {
        "cs": "Polorejnok obecný",
        "en": "Sawback Angelshark"
    },
    "1139": {
        "cs": "Chobotnice kroužkovaná",
        "en": "Greater Blue-ringed Octopus"
    },
    "1140": {
        "cs": "Bezkýlovec listošupinatý",
        "en": "Leafscale Gulper Shark"
    },
    "1141": {
        "cs": "Žralok velrybář",
        "en": "Dusky Shark"
    },
    "1142": {
        "cs": "Parmovec skvělý",
        "en": "Banggai Cardinalfish"
    },
    "1143": {
        "cs": "Studnař Rosenblattův",
        "en": "Blue Dot Jawfish"
    },
    "1144": {
        "cs": "Studnař řemínkový",
        "en": "Chinstrap Jawfish"
    },
    "1145": {
        "cs": "Slizoun znamenitý",
        "en": "Gulf Signal Blenny"
    },
    "1146": {
        "cs": "Vranka červená",
        "en": "Red Irish lord"
    },
    "1147": {
        "cs": "Hlaváč širokopruhý",
        "en": "Broad-barred Goby"
    },
    "1148": {
        "cs": "Hlaváč krabí",
        "en": "Twin-spot Goby"
    },
    "1149": {
        "cs": "Placka pomořanská",
        "en": "Allis shad"
    },
    "1150": {
        "cs": "Bolen dravý",
        "en": "Asp"
    },
    "1151": {
        "cs": "Slunka obecná",
        "en": "Sunbleak"
    },
    "1152": {
        "cs": "Podoustev říční",
        "en": "Vimba Bream"
    },
    "1153": {
        "cs": "Mřenka mramorovaná",
        "en": "Stone Loach"
    },
    "1154": {
        "cs": "Carcharocles chubutensis",
        "en": "Carcharocles chubutensis"
    },
    "1155": {
        "cs": "Cretoxyrhina",
        "en": "Cretoxyrhina"
    },
    "1156": {
        "cs": "Deltoptychius",
        "en": "Deltoptychius"
    },
    "1157": {
        "cs": "Ischnacanthus",
        "en": "Ischnacanthus"
    },
    "1158": {
        "cs": "Ctenurella",
        "en": "Ctenurella"
    },
    "1159": {
        "cs": "Astraspis",
        "en": "Astraspis"
    },
    "1160": {
        "cs": "Boreaspis",
        "en": "Boreaspis"
    },
    "1161": {
        "cs": "Dartmuthia",
        "en": "Dartmuthia"
    },
    "1162": {
        "cs": "Doryaspis arctica",
        "en": "Doryaspis arctica"
    },
    "1163": {
        "cs": "Doryaspis nathorsti",
        "en": "Doryaspis nathorsti"
    },
    "1164": {
        "cs": "Kančík papouščí",
        "en": "Parrot Cichlid"
    },
    "1165": {
        "cs": "Kančík perleťový",
        "en": "Jack Dempsey"
    },
    "1166": {
        "cs": "Kančík Doviův",
        "en": "Guapote"
    },
    "1167": {
        "cs": "Kančík managujský",
        "en": "Jaguar Guapote"
    },
    "1168": {
        "cs": "Kančík červenohlavý",
        "en": "Redhead Cichlid"
    },
    "1169": {
        "cs": "Keříčkovec jeskynní",
        "en": "Golden Cave Catfish"
    },
    "1170": {
        "cs": "Anténovec ozdobný",
        "en": "Pictus Catfish"
    },
    "1171": {
        "cs": "Sanak asijský",
        "en": "Giant Salmon Carp"
    },
    "1172": {
        "cs": "Pilníkotrn slepený",
        "en": "Bridled Leatherjacket"
    },
    "1173": {
        "cs": "Uzlatka východoatlantská",
        "en": "Risso's Smooth-head"
    },
    "1174": {
        "cs": "Štikovka brazilská",
        "en": "Boulengerella Cuvieri"
    },
    "1175": {
        "cs": "Máčka úzkohlavá",
        "en": "Narrowhead Catshark"
    },
    "1176": {
        "cs": "Narcina surinamská",
        "en": "Painted electric ray"
    },
    "1177": {
        "cs": "Dlouhozubec dravý",
        "en": "Evermannella Balbo"
    },
    "1178": {
        "cs": "Páskoun pruhovaný",
        "en": "Unicorn Crestfish"
    },
    "1179": {
        "cs": "Cichlida piquiti",
        "en": "Azul Peacock Bass"
    },
    "1180": {
        "cs": "Trahir krátkoocasý",
        "en": "Red Wolf Fish"
    },
    "1181": {
        "cs": "Anténovec skvrnitý",
        "en": "Spotted Tiger Shovelnose Catfish"
    },
    "1182": {
        "cs": "Terčovka pulcovitá",
        "en": "Tadpole Snailfish"
    },
    "1183": {
        "cs": "Slimule pelagická",
        "en": "Midwater Eelpout"
    },
    "1184": {
        "cs": "Pseudoliparis Swirei",
        "en": "Mariana Snailfish"
    },
    "1185": {
        "cs": "Muréna zlatá",
        "en": "Dwarf Moray"
    },
    "1186": {
        "cs": "Manta mexická",
        "en": "Smoothtail Mobula"
    },
    "1187": {
        "cs": "Pilníkotrn Taylorův",
        "en": "Taylor's Inflator Filefish"
    },
    "1188": {
        "cs": "Tupohlavec krátkochvostý",
        "en": "Shortdorsal Cutthroat Eel"
    },
    "1189": {
        "cs": "Muréna sladkovodní",
        "en": "Freshwater Moray"
    },
    "1190": {
        "cs": "Jeskyňovka Yunokawa",
        "en": "Grammonus Yunokawai"
    },
    "1191": {
        "cs": "Akilolo nosatý",
        "en": "Green Birdmouth Wrasse"
    },
    "1192": {
        "cs": "Duhovka lososová",
        "en": "Red Rainbowfish"
    },
    "1193": {
        "cs": "Hadař zubatkový",
        "en": "Angler Snake Eel"
    },
    "1194": {
        "cs": "Bezkýlovec lopatonosý",
        "en": "Birdbeak Dogfish"
    },
    "1195": {
        "cs": "Lampovníček Barnardův",
        "en": "Barnards Lanternfish"
    },
    "1196": {
        "cs": "Kanic šípohlavý",
        "en": "Arrowhead Soapfish"
    },
    "1197": {
        "cs": "Parmice pruhovaná",
        "en": "Fluorescing Goatfish"
    },
    "1198": {
        "cs": "Kostlín zlatý",
        "en": "Golden Gar"
    },
    "1199": {
        "cs": "",
        "en": "Bluestripe Pipefish"
    },
    "1200": {
        "cs": "",
        "en": "Sulawesi Coelacanth"
    },
    "1201": {
        "cs": "",
        "en": "African Mottled Eel"
    },
    "1202": {
        "cs": "",
        "en": "Blue Panchax"
    },
    "1203": {
        "cs": "",
        "en": "Crocodile-tooth Pipefish"
    }
  };

  if (typeof window !== 'undefined') {
    window.FISHAO_I18N_FISH_NAMES = fishNames;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = fishNames;
  }
})();

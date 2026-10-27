export const SPECIES_LIST = [
  'Dog', 'Cat', 'Cattle', 'Horse', 'Goat', 'Sheep', 'Rabbit', 'Poultry',
  'Pig', 'Buffalo', 'Elephant', 'Camel', 'Donkey', 'Other',
];

export const BREEDS_BY_SPECIES: Record<string, string[]> = {
  Dog: [
    'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'Poodle', 'Beagle',
    'Rottweiler', 'Doberman', 'Pug', 'Chihuahua', 'Great Dane', 'Siberian Husky',
    'Indian Pariah Dog', 'Dachshund', 'Boxer', 'Saint Bernard', 'Shih Tzu',
    'Cocker Spaniel', 'Pomeranian', 'Lhasa Apso', 'Bulldog',
  ],
  Cat: [
    'Persian', 'Siamese', 'Maine Coon', 'Bengal', 'British Shorthair', 'Ragdoll',
    'Domestic Shorthair', 'Abyssinian', 'Scottish Fold', 'Bombay Cat',
    'Siamese Cat', 'Oriental Shorthair', 'Turkish Angora',
  ],
  Cattle: [
    'Gir', 'Sahiwal', 'Red Sindhi', 'Jersey', 'Holstein Friesian', 'Kangayam',
    'Tharparkar', 'Kankrej', 'Hariana', 'Ongole', 'Krishna Valley', 'Hallikar',
  ],
  Horse: [
    'Marwari', 'Kathiawari', 'Arabian', 'Thoroughbred', 'Indian Spiti Pony',
    'Bhutia Pony', 'Zanskari Pony', 'Manipuri Pony', 'Marwari Horse',
  ],
  Goat: [
    'Beetal', 'Jamunapari', 'Boer', 'Sirohi', 'Barbari', 'Black Bengal',
    'Osmanabadi', 'Jakhrana', 'Marwari Goat', 'Kanni Adu',
  ],
  Sheep: [
    'Marwari Sheep', 'Chokla', 'Nali', 'Magra', 'Jaisalmeri', 'Malpura',
    'Sonali', 'Deccani', 'Mandya', 'Coimbatore',
  ],
  Rabbit: [
    'Angora', 'Rex', 'Dutch', 'Mini Lop', 'New Zealand White', 'Californian',
    'Soviet Chinchilla', 'Grey Giant', 'Flemish Giant',
  ],
  Poultry: [
    'Leghorn', 'Rhode Island Red', 'Kadaknath', 'Aseel', 'Busra', 'Chittagong',
    'Kadaknath', 'Plymouth Rock', 'Sussex', 'Orpington',
  ],
  Pig: [
    'Large White Yorkshire', 'Duroc', 'Landrace', 'Hampshire', 'Berkshire',
    'Large Black', 'Tamworth', 'Meishan',
  ],
  Buffalo: [
    'Murrah', 'Mehsana', 'Jaffarabadi', 'Nili-Ravi', 'Surti', 'Nagpuri',
    'Pandharpuri', 'Bhadawari',
  ],
  Elephant: [
    'Indian Elephant', 'African Bush Elephant', 'African Forest Elephant',
  ],
  Camel: [
    'Dromedary (Single-Humped)', 'Bactrian (Double-Humped)', 'Kachchhi Camel', 'Mewari Camel',
  ],
  Donkey: [
    'Indian Wild Ass (Ghudkhur)', 'Spiti Donkey', 'Kutch Donkey', 'Halari Donkey',
  ],
  Other: [],
};

export function getBreedsForSpecies(species: string): string[] {
  return BREEDS_BY_SPECIES[species] ?? [];
}

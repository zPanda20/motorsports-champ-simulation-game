// Wider names (slice 5). The first-name lists in engine/names.js are the names of the 1900s to 1940s
// births; these add the names of later generations, more sound families for surnames, and more
// nationalities. The fixed legend roster keeps using the original tables so it never changes.

// ---- first names by generation, for the 17 original nationalities ----
export const FIRST_MID = {
  GB: ['Graham', 'Nigel', 'Martin', 'Trevor', 'Stephen', 'Keith', 'Malcolm', 'Derek', 'Roger', 'Colin', 'Clive', 'Julian', 'Gareth', 'Simon', 'Adrian', 'Neil'],
  US: ['Gary', 'Dennis', 'Randy', 'Craig', 'Brent', 'Scott', 'Kevin', 'Mark', 'Todd', 'Roy', 'Wayne', 'Dwight', 'Jeff', 'Brett', 'Darryl', 'Terry'],
  FR: ['Alain', 'Patrick', 'Thierry', 'Didier', 'Christophe', 'Philippe', 'Yves', 'Bruno', 'Laurent', 'Olivier', 'Pascal', 'Gilles', 'Michel', 'Serge', 'Régis', 'Franck'],
  IT: ['Riccardo', 'Massimo', 'Stefano', 'Fabio', 'Maurizio', 'Gianni', 'Paolo', 'Claudio', 'Roberto', 'Davide', 'Marco', 'Giancarlo', 'Ivano', 'Lorenzo', 'Ettore', 'Nicola'],
  DE: ['Jürgen', 'Dieter', 'Uwe', 'Stefan', 'Thomas', 'Michael', 'Ralf', 'Klaus', 'Wolfgang', 'Frank', 'Bernd', 'Markus', 'Holger', 'Andreas', 'Jens', 'Torsten'],
  ES: ['Javier', 'Jordi', 'Miguel', 'Alejandro', 'Fernando', 'Sergio', 'Enrique', 'Andrés', 'Ángel', 'Carlos', 'David', 'Pablo', 'Rubén', 'Ismael', 'Joan', 'Íñigo'],
  NL: ['Jeroen', 'Marco', 'Erik', 'Ruud', 'Wim', 'Henk', 'Frank', 'Mark', 'Rob', 'Ronald', 'Dennis', 'Patrick', 'Bas', 'Joris', 'Niels', 'Michiel'],
  BE: ['Philippe', 'Thierry', 'Yves', 'Marc', 'Didier', 'Eddy', 'Luc', 'Dirk', 'Koen', 'Wim', 'Patrick', 'Johan', 'Bart', 'Jean-Paul', 'Stéphane', 'Olivier'],
  CH: ['Urs', 'Peter', 'Daniel', 'Marcel', 'Reto', 'Stephan', 'Christoph', 'Thomas', 'Beat', 'Roland', 'Fabian', 'Silvio', 'Patrick', 'Adrian', 'Mario', 'Dario'],
  SE: ['Stefan', 'Mikael', 'Jonas', 'Magnus', 'Fredrik', 'Peter', 'Patrik', 'Johan', 'Henrik', 'Mattias', 'Tobias', 'Anders', 'Joakim', 'Niklas', 'Rickard', 'Daniel'],
  AT: ['Gerhard', 'Helmut', 'Harald', 'Wolfgang', 'Manfred', 'Reinhard', 'Roland', 'Thomas', 'Christian', 'Markus', 'Alexander', 'Dietmar', 'Herbert', 'Walter', 'Florian', 'Bernhard'],
  AR: ['Diego', 'Gustavo', 'Sergio', 'Claudio', 'Fabián', 'Martín', 'Pablo', 'Leandro', 'Gonzalo', 'Ariel', 'Maximiliano', 'Cristian', 'Mariano', 'Esteban', 'Guillermo', 'Emilio'],
  AU: ['Mark', 'Craig', 'Glenn', 'Shane', 'Brett', 'Scott', 'Damien', 'Troy', 'Darren', 'Todd', 'Rod', 'Warren', 'Jason', 'Adam', 'Matt', 'Cameron'],
  BR: ['Ayrton', 'Nelson', 'Mauro', 'Wilson', 'Roberto', 'Cláudio', 'Alexandre', 'Ricardo', 'Fernando', 'Márcio', 'Sérgio', 'Rubens', 'Flávio', 'Leonardo', 'Anderson', 'Jorge'],
  CA: ['Kevin', 'Greg', 'Brian', 'Mark', 'Darren', 'Jason', 'Rob', 'Scott', 'Shane', 'Trevor', 'Jeff', 'Mike', 'Derek', 'Chris', 'Sean', 'Marc-André'],
  KR: ['Sung-ho', 'Jung-hoon', 'Dong-wook', 'Young-ho', 'Chang-min', 'Seong-jin', 'Kyung-soo', 'Jae-hyun', 'Hyung-jin', 'Min-ho', 'Jin-woo', 'Tae-hoon', 'Sang-min', 'Byung-chul', 'Ki-hyun', 'Won-jae'],
  JP: ['Hideki', 'Kazuyoshi', 'Ukyo', 'Satoru', 'Toshio', 'Masahiro', 'Yoshiaki', 'Takuma', 'Shinji', 'Koji', 'Tadashi', 'Hiroyuki', 'Kenichi', 'Akira', 'Noboru', 'Yasushi'],
};
export const FIRST_MODERN = {
  GB: ['Oliver', 'Harry', 'Jack', 'George', 'Callum', 'Archie', 'Freddie', 'Rory', 'Toby', 'Finlay', 'Jake', 'Ethan', 'Theo', 'Max', 'Alfie', 'Josh'],
  US: ['Tyler', 'Mason', 'Logan', 'Jaden', 'Austin', 'Hunter', 'Cooper', 'Colton', 'Brayden', 'Parker', 'Landon', 'Dylan', 'Carter', 'Grayson', 'Wyatt', 'Chase'],
  FR: ['Lucas', 'Hugo', 'Théo', 'Nathan', 'Enzo', 'Maxime', 'Clément', 'Mathis', 'Louis', 'Antoine', 'Baptiste', 'Romain', 'Tom', 'Axel', 'Raphaël', 'Jules'],
  IT: ['Matteo', 'Leonardo', 'Lorenzo', 'Tommaso', 'Gabriele', 'Edoardo', 'Andrea', 'Federico', 'Alessio', 'Mattia', 'Simone', 'Samuele', 'Filippo', 'Diego', 'Emanuele', 'Giacomo'],
  DE: ['Lukas', 'Jonas', 'Leon', 'Felix', 'Finn', 'Noah', 'Niklas', 'Maximilian', 'Tim', 'Jannik', 'Moritz', 'Elias', 'Luis', 'Julian', 'Paul', 'Ben'],
  ES: ['Hugo', 'Pablo', 'Mario', 'Álex', 'Adrián', 'Daniel', 'Iker', 'Marc', 'Dani', 'Izan', 'Bruno', 'Aitor', 'Oriol', 'Pol', 'Nil', 'Unai'],
  NL: ['Daan', 'Sem', 'Lucas', 'Milan', 'Thijs', 'Luuk', 'Jesse', 'Stijn', 'Ruben', 'Tim', 'Noah', 'Mees', 'Guus', 'Sven', 'Max', 'Jelle'],
  BE: ['Arthur', 'Noah', 'Lucas', 'Louis', 'Liam', 'Mathis', 'Nathan', 'Robbe', 'Warre', 'Seppe', 'Lars', 'Elias', 'Maxime', 'Victor', 'Jules', 'Tuur'],
  CH: ['Noah', 'Luca', 'Levin', 'Nico', 'Jan', 'Livio', 'Gian', 'Lars', 'Elias', 'Nils', 'Joel', 'Ramon', 'Mauro', 'Fabio', 'Dario', 'Yanick'],
  SE: ['William', 'Oscar', 'Liam', 'Elias', 'Hugo', 'Axel', 'Filip', 'Viktor', 'Leo', 'Melvin', 'Isak', 'Noel', 'Albin', 'Sixten', 'Vincent', 'Edvin'],
  AT: ['Lukas', 'Jakob', 'Maximilian', 'Felix', 'David', 'Fabian', 'Tobias', 'Elias', 'Paul', 'Moritz', 'Raphael', 'Noah', 'Simon', 'Patrick', 'Leo', 'Valentin'],
  AR: ['Thiago', 'Santino', 'Bautista', 'Benjamín', 'Joaquín', 'Lautaro', 'Tomás', 'Valentín', 'Franco', 'Lucas', 'Agustín', 'Ignacio', 'Mateo', 'Bruno', 'Dante', 'Lisandro'],
  AU: ['Oscar', 'Jackson', 'Lachie', 'Mitchell', 'Riley', 'Hudson', 'Flynn', 'Declan', 'Harrison', 'Zac', 'Noah', 'Cooper', 'Hamish', 'Archer', 'Beau', 'Kai'],
  BR: ['Davi', 'Miguel', 'Arthur', 'Heitor', 'Gabriel', 'Enzo', 'Guilherme', 'Lorenzo', 'Pedro', 'Samuel', 'João', 'Kauã', 'Otávio', 'Cauã', 'Igor', 'Matheus'],
  CA: ['Liam', 'Noah', 'Ethan', 'Jayden', 'Owen', 'Nathan', 'Carter', 'Mason', 'Tyson', 'Brody', 'Connor', 'Jordan', 'Ryder', 'Lucas', 'Everett', 'Callum'],
  KR: ['Do-hyun', 'Ji-hoon', 'Seo-jun', 'Ha-jun', 'Yu-jun', 'Eun-seong', 'Si-woo', 'Ju-won', 'Min-jae', 'Jun-seo', 'Hyun-seo', 'Ye-jun', 'Gun-woo', 'Ji-an', 'Tae-oh', 'Seung-min'],
  JP: ['Ren', 'Sota', 'Haruto', 'Yuma', 'Riku', 'Kaito', 'Hinata', 'Taiga', 'Minato', 'Yuto', 'Sora', 'Tsubasa', 'Itsuki', 'Ryusei', 'Asahi', 'Kota'],
};
export const FIRST_F_MID = {
  GB: ['Susan', 'Karen', 'Alison', 'Sandra', 'Julie', 'Fiona', 'Gillian', 'Diane', 'Tracy', 'Lesley', 'Paula', 'Helen', 'Sharon', 'Joanne', 'Rachel', 'Nicola'],
  US: ['Tammy', 'Debbie', 'Cindy', 'Lori', 'Tina', 'Kimberly', 'Michelle', 'Donna', 'Shelly', 'Tricia', 'Becky', 'Stacy', 'Dana', 'Carol', 'Pam', 'Renee'],
  FR: ['Sylvie', 'Nathalie', 'Isabelle', 'Valérie', 'Corinne', 'Sandrine', 'Véronique', 'Catherine', 'Martine', 'Brigitte', 'Christine', 'Florence', 'Muriel', 'Laurence', 'Karine', 'Delphine'],
  IT: ['Paola', 'Monica', 'Daniela', 'Federica', 'Cristina', 'Barbara', 'Simona', 'Elisabetta', 'Sabrina', 'Roberta', 'Laura', 'Patrizia', 'Silvia', 'Alessandra', 'Manuela', 'Rita'],
  DE: ['Petra', 'Sabine', 'Claudia', 'Birgit', 'Andrea', 'Heike', 'Katrin', 'Susanne', 'Monika', 'Anja', 'Nicole', 'Martina', 'Silke', 'Ute', 'Bettina', 'Kerstin'],
  ES: ['Montserrat', 'Cristina', 'Raquel', 'Marta', 'Silvia', 'Patricia', 'Mónica', 'Nuria', 'Eva', 'Yolanda', 'Alicia', 'Laia', 'Sonia', 'Elena', 'Verónica', 'Inmaculada'],
  NL: ['Ingrid', 'Monique', 'Esther', 'Marieke', 'Karin', 'Sandra', 'Linda', 'Renate', 'Petra', 'Yvonne', 'Marjolein', 'Nicole', 'Anouk', 'Mirjam', 'Saskia', 'Inge'],
  BE: ['Veronique', 'Nathalie', 'Sophie', 'Isabelle', 'Ann', 'Els', 'Griet', 'Sabine', 'Katrien', 'Christel', 'Françoise', 'Martine', 'Anne', 'Valérie', 'Hilde', 'Inge'],
  CH: ['Daniela', 'Sandra', 'Corinne', 'Nadja', 'Barbara', 'Monika', 'Regula', 'Karin', 'Brigitte', 'Andrea', 'Sibylle', 'Claudia', 'Martina', 'Franziska', 'Esther', 'Cornelia'],
  SE: ['Anna', 'Eva', 'Lena', 'Maria', 'Kristina', 'Helena', 'Marie', 'Camilla', 'Susanne', 'Cecilia', 'Charlotte', 'Malin', 'Pernilla', 'Ulrika', 'Åsa', 'Carina'],
  AT: ['Sabine', 'Gabriele', 'Claudia', 'Karin', 'Andrea', 'Martina', 'Eva', 'Silvia', 'Barbara', 'Manuela', 'Doris', 'Birgit', 'Monika', 'Elke', 'Susanne', 'Renate'],
  AR: ['Claudia', 'Mariana', 'Laura', 'Gabriela', 'Silvana', 'Paula', 'Verónica', 'Marcela', 'Andrea', 'Cecilia', 'Natalia', 'Romina', 'Karina', 'Viviana', 'Soledad', 'Daniela'],
  AU: ['Michelle', 'Kylie', 'Leanne', 'Tanya', 'Rebecca', 'Natalie', 'Kristy', 'Melinda', 'Belinda', 'Jodie', 'Narelle', 'Kerrie', 'Sharyn', 'Renee', 'Simone', 'Bronwyn'],
  BR: ['Adriana', 'Cláudia', 'Simone', 'Luciana', 'Patrícia', 'Fernanda', 'Vanessa', 'Roberta', 'Renata', 'Cristiane', 'Márcia', 'Priscila', 'Sandra', 'Elaine', 'Daniela', 'Kátia'],
  CA: ['Tammy', 'Michelle', 'Lisa', 'Jennifer', 'Tanya', 'Kelly', 'Natalie', 'Stacey', 'Shannon', 'Jodi', 'Crystal', 'Danielle', 'Nathalie', 'Isabelle', 'Karine', 'Chantal'],
  KR: ['Mi-kyung', 'Young-hee', 'Sun-ok', 'Eun-kyung', 'Jung-ah', 'Soo-jin', 'Hye-won', 'Kyung-mi', 'Ji-hye', 'Mi-sook', 'Eun-hee', 'Yeon-hee', 'Jin-ah', 'Su-jin', 'Hyo-jin', 'Bo-mi'],
  JP: ['Yoko', 'Keiko', 'Tomoko', 'Mayumi', 'Kumiko', 'Yumiko', 'Miki', 'Sachiko', 'Atsuko', 'Chieko', 'Junko', 'Michiko', 'Rumi', 'Harumi', 'Eri', 'Mariko'],
};
export const FIRST_F_MODERN = {
  GB: ['Olivia', 'Amelia', 'Isla', 'Freya', 'Poppy', 'Ellie', 'Millie', 'Grace', 'Evie', 'Lily', 'Jessica', 'Ruby', 'Daisy', 'Sophie', 'Phoebe', 'Maisie'],
  US: ['Madison', 'Emma', 'Harper', 'Ava', 'Kennedy', 'Brooklyn', 'Savannah', 'Peyton', 'Mackenzie', 'Addison', 'Riley', 'Hailey', 'Paisley', 'Avery', 'Scarlett', 'Quinn'],
  FR: ['Léa', 'Chloé', 'Manon', 'Camille', 'Inès', 'Jade', 'Louise', 'Zoé', 'Lola', 'Océane', 'Emma', 'Margaux', 'Clara', 'Anaïs', 'Juliette', 'Lina'],
  IT: ['Sofia', 'Giorgia', 'Aurora', 'Alice', 'Ginevra', 'Beatrice', 'Chiara', 'Martina', 'Greta', 'Emma', 'Vittoria', 'Matilde', 'Ludovica', 'Gaia', 'Noemi', 'Arianna'],
  DE: ['Mia', 'Emma', 'Hannah', 'Lena', 'Lea', 'Emilia', 'Marie', 'Sophie', 'Leonie', 'Lina', 'Johanna', 'Jana', 'Laura', 'Nele', 'Ida', 'Finja'],
  ES: ['Lucía', 'Paula', 'Sofía', 'Martina', 'Julia', 'Daniela', 'Alba', 'Valeria', 'Noa', 'Carla', 'Claudia', 'Irene', 'Sara', 'Vega', 'Ainhoa', 'Aitana'],
  NL: ['Emma', 'Sophie', 'Julia', 'Tess', 'Lotte', 'Fleur', 'Noor', 'Isa', 'Eva', 'Lisa', 'Nina', 'Sara', 'Anouk', 'Mila', 'Feline', 'Yara'],
  BE: ['Emma', 'Louise', 'Marie', 'Olivia', 'Nore', 'Juliette', 'Lotte', 'Camille', 'Alice', 'Lina', 'Ella', 'Fien', 'Amélie', 'Lore', 'Elise', 'Mila'],
  CH: ['Mia', 'Lara', 'Lea', 'Nina', 'Selina', 'Jana', 'Anja', 'Noemi', 'Livia', 'Sara', 'Elin', 'Alina', 'Fiona', 'Larissa', 'Enya', 'Ladina'],
  SE: ['Alice', 'Maja', 'Ella', 'Wilma', 'Elsa', 'Saga', 'Alma', 'Ebba', 'Vera', 'Julia', 'Agnes', 'Stella', 'Selma', 'Livia', 'Tilda', 'Elvira'],
  AT: ['Anna', 'Emilia', 'Marie', 'Sophie', 'Lena', 'Hannah', 'Lea', 'Mia', 'Johanna', 'Valentina', 'Magdalena', 'Katharina', 'Selina', 'Julia', 'Laura', 'Viktoria'],
  AR: ['Emma', 'Mía', 'Isabella', 'Catalina', 'Delfina', 'Renata', 'Olivia', 'Bianca', 'Pilar', 'Victoria', 'Agustina', 'Abril', 'Malena', 'Jazmín', 'Lara', 'Zoe'],
  AU: ['Charlotte', 'Matilda', 'Isla', 'Mia', 'Ava', 'Chloe', 'Zara', 'Harper', 'Evie', 'Piper', 'Willow', 'Georgia', 'Tahlia', 'Ruby', 'Ivy', 'Harlow'],
  BR: ['Helena', 'Alice', 'Laura', 'Manuela', 'Valentina', 'Sophia', 'Isabella', 'Heloísa', 'Luna', 'Júlia', 'Lara', 'Maya', 'Eloá', 'Cecília', 'Lívia', 'Yasmin'],
  CA: ['Emma', 'Olivia', 'Charlotte', 'Chloé', 'Léa', 'Sophie', 'Ava', 'Avery', 'Brooklyn', 'Hailey', 'Piper', 'Mackenzie', 'Zoé', 'Ella', 'Maya', 'Aurora'],
  KR: ['Seo-yun', 'Ha-yoon', 'Ji-an', 'Seo-ah', 'Ha-rin', 'Ye-rin', 'Soo-bin', 'Chae-young', 'Yeon-woo', 'Ji-yu', 'Da-in', 'Ye-ji', 'Ah-rin', 'Si-yeon', 'Min-ji', 'So-yul'],
  JP: ['Himari', 'Mio', 'Yui', 'Aoi', 'Rin', 'Hinata', 'Sana', 'Koharu', 'Ichika', 'Mei', 'Yuna', 'Akari', 'Tsumugi', 'Riko', 'Nanami', 'Hiyori'],
};

// ---- extra surname parts (added to the original families, so names are less repetitive) ----
export const FAMILY_EXTRA = {
  GB: { stems: ['Aber', 'Bram', 'Calder', 'Dray', 'Elm', 'Fenn', 'Gar', 'Hay', 'Ing', 'Kest', 'Lyn', 'Marsh', 'Oak', 'Pem', 'Quill', 'Rother', 'Sed', 'Tre', 'Ull', 'Wex'], ends: ['wick', 'by', 'shaw', 'cott', 'mere', 'stow', 'win', 'thorpe', 'dale', 'ridge', 'low', 'den', 'combe', 'son', 'er'] },
  US: { stems: ['Bol', 'Cal', 'Dev', 'Eld', 'Fra', 'Gra', 'Hud', 'Jen', 'Kel', 'Lew', 'Mil', 'Nel', 'Pea', 'Rey', 'Sut', 'Tay', 'Wat'], ends: ['er', 'kins', 'ing', 'more', 'wood', 'wick', 'son', 'ett', 'ard', 'ey'] },
  FR: { stems: ['Aub', 'Bro', 'Cou', 'Dela', 'Esc', 'Fon', 'Gau', 'Hen', 'Jou', 'Lef', 'Mor', 'Nov', 'Per', 'Rey', 'Sim', 'Tou', 'Ver'], ends: ['ier', 'ain', 'ard', 'eau', 'ier', 'ois', 'ard', 'at', 'in', 'ac', 'ène', 'illon'] },
  IT: { stems: ['Aldo', 'Bru', 'Cap', 'Dom', 'Fab', 'Gav', 'Lan', 'Man', 'Nic', 'Orl', 'Pic', 'Ric', 'Sar', 'Tes', 'Ugo', 'Viv'], ends: ['ini', 'etti', 'ano', 'ese', 'one', 'elli', 'otti', 'ato', 'azzi', 'ino'], double: true },
  DE: { stems: ['Adler', 'Bau', 'Dorn', 'Falk', 'Geb', 'Heinz', 'Jäg', 'Kolb', 'Lieb', 'Mer', 'Nau', 'Ober', 'Pfeif', 'Reich', 'Sand', 'Thal', 'Wolf'], ends: ['er', 'mann', 'hof', 'ler', 'kamp', 'rath', 'schmidt', 'meyer', 'wald', 'baum'] },
  ES: { stems: ['Ag', 'Bení', 'Cabr', 'Dur', 'Esp', 'Fig', 'Guer', 'Ibá', 'Jim', 'Lar', 'Mena', 'Nún', 'Olm', 'Prie', 'Ram', 'Sua', 'Ter'], ends: ['ez', 'ero', 'ales', 'illa', 'edo', 'arte', 'uela', 'eda', 'ano', 'ón'] },
  NL: { stems: ['Aa', 'Bos', 'Coen', 'Drie', 'Egg', 'Fok', 'Gro', 'Heij', 'Kok', 'Lam', 'Mees', 'Nij', 'Oost', 'Pot', 'Rem', 'Sch', 'Veen'], ends: ['man', 'ink', 'huis', 'kamp', 'stra', 'sma', 'berg', 'veld', 'wijk', 'sen'] },
  BE: { stems: ['Aerts', 'Bogaert', 'Cools', 'Desm', 'Goos', 'Hend', 'Jans', 'Lemm', 'Maes', 'Smet', 'Thys', 'Wouters'], ends: ['', 'ens', 'ier', 'aerts', 'mans', 'ers', 'ynck'] },
  CH: { stems: ['Aeb', 'Bach', 'Egg', 'Fur', 'Gass', 'Hug', 'Jost', 'Kau', 'Mül', 'Nuss', 'Rüeg', 'Sch', 'Tho', 'Vogt', 'Wid'], ends: ['er', 'ler', 'li', 'mann', 'ner', 'i', 'in', 'ini'] },
  SE: { stems: ['Ber', 'Dahl', 'Fors', 'Gus', 'Hag', 'Jo', 'Kar', 'Lund', 'Möl', 'Nor', 'Sand', 'Tor', 'Wik'], ends: ['son', 'man', 'gren', 'blom', 'ell', 'lund', 'ström', 'berg', 'stedt'] },
  AT: { stems: ['Aign', 'Bauer', 'Eder', 'Fink', 'Gschw', 'Huber', 'Kainz', 'Leit', 'Maier', 'Nuss', 'Pich', 'Rieder', 'Schö', 'Wimm'], ends: ['er', 'hofer', 'ner', 'bauer', 'mayr', 'inger', 'ler', 'berger'] },
  AR: { stems: ['Ace', 'Bar', 'Cabr', 'Dom', 'Fior', 'Gimen', 'Ibar', 'Lop', 'Maldon', 'Orte', 'Pas', 'Quir', 'Sosa', 'Vill'], ends: ['ez', 'ero', 'ano', 'etti', 'ini', 'a', 'o', 'ado', 'ón'] },
  AU: { stems: ['Cam', 'Dal', 'Fin', 'Gra', 'Hen', 'Kel', 'Lach', 'Murr', 'Nolan', 'Pol', 'Rus', 'Tay', 'Wil'], ends: ['er', 'ley', 'ton', 'son', 'ford', 'by', 'shaw', 'ham', 'well', 'ett'] },
  BR: { stems: ['Ara', 'Bar', 'Cam', 'Dias', 'Fran', 'Guim', 'Lob', 'Maga', 'Nune', 'Olive', 'Pinh', 'Rama', 'Souz', 'Tava'], ends: ['es', 'eiro', 'ão', 'inho', 'ado', 'ares', 'edo', 'a', 'ino'] },
  CA: { stems: ['Beck', 'Cam', 'Dub', 'Fra', 'Gag', 'Hol', 'Lac', 'Mor', 'Pel', 'Rob', 'Sin', 'Thib', 'Whi'], ends: ['er', 'ault', 'ier', 'ton', 'lin', 'ell', 'field', 'ey', 'son', 'ette'] },
  KR: { stems: ['Bae', 'Moon', 'Noh', 'Oh', 'Ryu', 'Yang', 'Baek', 'Ahn', 'Hong', 'Nam', 'Gu', 'Min'], ends: [''] },
  JP: { stems: ['Abe', 'Endo', 'Goto', 'Hirai', 'Inoue', 'Kondo', 'Maeda', 'Nishi', 'Ota', 'Sato', 'Taka', 'Ueda', 'Yoshi', 'Kuri'], ends: ['', 'mura', 'moto', 'gawa', 'kawa', 'hashi', 'ta', 'no', 'zaki', 'be'] },
};

// ---- nationalities added in slice 5: first names (older generations, then newer) and surname parts ----
export const NEW_NATIONALITIES = ['IE', 'PT', 'FI', 'DK', 'NO', 'PL', 'MX', 'CO', 'ZA', 'NZ', 'IN', 'CN'];
export const NEW_FIRST = {
  IE: { m: ['Declan', 'Seamus', 'Brendan', 'Colm', 'Fergal', 'Cormac', 'Padraig', 'Eoin', 'Niall', 'Ronan', 'Tadhg', 'Conor'], f: ['Siobhán', 'Orla', 'Maeve', 'Niamh', 'Aoife', 'Grainne', 'Fionnuala', 'Deirdre', 'Roisin', 'Clodagh', 'Sinéad', 'Eilish'] },
  PT: { m: ['Duarte', 'Tiago', 'Rui', 'Nuno', 'Joaquim', 'Hélder', 'Miguel', 'Vasco', 'Afonso', 'Rodrigo', 'Gonçalo', 'Fábio'], f: ['Inês', 'Catarina', 'Beatriz', 'Madalena', 'Filipa', 'Joana', 'Teresa', 'Leonor', 'Mariana', 'Rita', 'Susana', 'Margarida'] },
  FI: { m: ['Mika', 'Kimi', 'Jari', 'Heikki', 'Keke', 'Valtteri', 'Antti', 'Juha', 'Ville', 'Teemu', 'Onni', 'Eino'], f: ['Aino', 'Helmi', 'Kaarina', 'Liisa', 'Maija', 'Sanna', 'Tuuli', 'Iida', 'Venla', 'Aava', 'Elina', 'Hanna'] },
  DK: { m: ['Jens', 'Søren', 'Mads', 'Kasper', 'Henning', 'Lasse', 'Rasmus', 'Anders', 'Thorkild', 'Emil', 'Frederik', 'Mikkel'], f: ['Mette', 'Ingeborg', 'Signe', 'Karen', 'Freja', 'Camilla', 'Pernille', 'Sofie', 'Astrid', 'Clara', 'Maja', 'Ida'] },
  NO: { m: ['Ole', 'Trygve', 'Bjørn', 'Håkon', 'Lars', 'Torbjørn', 'Eirik', 'Sindre', 'Magnus', 'Kristoffer', 'Odd', 'Halvor'], f: ['Ingrid', 'Sigrid', 'Kari', 'Marit', 'Solveig', 'Thea', 'Nora', 'Ida', 'Siri', 'Hedda', 'Live', 'Maren'] },
  PL: { m: ['Tadeusz', 'Marek', 'Krzysztof', 'Wojciech', 'Piotr', 'Robert', 'Łukasz', 'Bartosz', 'Michał', 'Jakub', 'Kacper', 'Szymon'], f: ['Halina', 'Krystyna', 'Barbara', 'Ewa', 'Agnieszka', 'Magdalena', 'Joanna', 'Zuzanna', 'Maja', 'Julia', 'Natalia', 'Aleksandra'] },
  MX: { m: ['Pedro', 'Sergio', 'Esteban', 'Adrián', 'Alfonso', 'Memo', 'Rubén', 'Héctor', 'Emiliano', 'Santiago', 'Diego', 'Axel'], f: ['Guadalupe', 'Xóchitl', 'Marisol', 'Yolanda', 'Citlali', 'Fernanda', 'Ximena', 'Regina', 'Valentina', 'Camila', 'Renata', 'Mariana'] },
  CO: { m: ['Juan Pablo', 'Camilo', 'Santiago', 'Andrés', 'Mauricio', 'Jhon', 'Wilmer', 'Jairo', 'Felipe', 'Nicolás', 'Sebastián', 'Yeison'], f: ['Luz', 'Yesenia', 'Paola', 'Liliana', 'Stefanía', 'Valentina', 'Daniela', 'Catalina', 'Mariana', 'Sara', 'Isabella', 'Salomé'] },
  ZA: { m: ['Jody', 'Pieter', 'Hennie', 'Johan', 'Sipho', 'Thabo', 'Willem', 'Riaan', 'Kobus', 'Bongani', 'Duncan', 'Tiaan'], f: ['Nomsa', 'Thandi', 'Annelie', 'Lerato', 'Zanele', 'Elmarie', 'Busisiwe', 'Karabo', 'Mpho', 'Reneilwe', 'Chantelle', 'Ané'] },
  NZ: { m: ['Bruce', 'Denny', 'Chris', 'Scott', 'Hamish', 'Tane', 'Liam', 'Ryan', 'Mitch', 'Brendon', 'Aroha', 'Nikau'], f: ['Aroha', 'Mere', 'Hana', 'Kiri', 'Moana', 'Tui', 'Ngaire', 'Rangi', 'Ruby', 'Isla', 'Maia', 'Anika'] },
  IN: { m: ['Karun', 'Narain', 'Arjun', 'Rohan', 'Vikram', 'Sanjay', 'Aditya', 'Kabir', 'Rajiv', 'Armaan', 'Dev', 'Ishaan'], f: ['Priya', 'Anita', 'Meera', 'Kavita', 'Radhika', 'Anjali', 'Divya', 'Ananya', 'Ishita', 'Neha', 'Tara', 'Aarushi'] },
  CN: { m: ['Wei', 'Jian', 'Hao', 'Ming', 'Zhiqiang', 'Yuxuan', 'Bo', 'Chen', 'Haoran', 'Jun', 'Lei', 'Tao'], f: ['Mei', 'Xiu', 'Lan', 'Yan', 'Jing', 'Xinyi', 'Yuting', 'Fang', 'Ling', 'Hui', 'Zhen', 'Shu'] },
};
export const NEW_FAMILY = {
  IE: { stems: ['Kel', 'Dono', 'Brenn', 'Gal', 'Quin', 'Kenn', 'Nolan', 'Rior', 'Sulli', 'Flan', 'Doyl', 'Hog'], ends: ['an', 'ey', 'ahan', 'ell', 'agh', 'oran', 'ihy', 'ley', 'van', 'dy', 'ly'], prefix: ['Mc', 'O’', 'Mc', 'O’', 'Fitz'] },
  PT: { stems: ['Alm', 'Bar', 'Cost', 'Duar', 'Fer', 'Gonç', 'Lour', 'Mend', 'Nun', 'Per', 'Rib', 'Seq', 'Tei', 'Vas'], ends: ['eida', 'osa', 'es', 'alves', 'eira', 'ão', 'oso', 'ento', 'inho', 'os'] },
  FI: { stems: ['Häk', 'Kor', 'Lah', 'Mäk', 'Niem', 'Ruo', 'Sal', 'Vir', 'Heik', 'Laak', 'Ojan', 'Peltol'], ends: ['inen', 'nen', 'la', 'lainen', 'ranta', 'mäki', 'virta', 'saari', 'koski', 'lahti'] },
  DK: { stems: ['And', 'Bro', 'Chris', 'Han', 'Jens', 'Niel', 'Pede', 'Ras', 'Søren', 'Thom', 'Kjær', 'Ole'], ends: ['sen', 'gaard', 'holm', 'strup', 'lund', 'moos', 'bæk', 'rup', 'by', 'dal'] },
  NO: { stems: ['Aas', 'Berg', 'Dahl', 'Eide', 'Hau', 'Hol', 'Lie', 'Moe', 'Nord', 'Sæt', 'Tvei', 'Vik'], ends: ['', 'sen', 'stad', 'vik', 'dal', 'heim', 'rud', 'land', 'næs', 'bø'] },
  PL: { stems: ['Ada', 'Ber', 'Cza', 'Dąb', 'Gór', 'Kow', 'Lew', 'Mazur', 'Nowa', 'Piot', 'Szym', 'Wiśn', 'Zaj'], ends: ['ski', 'wicz', 'czyk', 'ak', 'ek', 'owski', 'czak', 'ewski', 'ik', 'cki'] },
  MX: { stems: ['Agui', 'Ávi', 'Cabr', 'Díaz', 'Esco', 'Gutié', 'Her', 'Ibar', 'Mora', 'Ort', 'Rami', 'Sand', 'Vega'], ends: ['rre', 'la', 'ez', 'dro', 'ales', 'illo', 'ado', 'ero', 'ón', 'o'] },
  CO: { stems: ['Arb', 'Cast', 'Dur', 'Gar', 'Herr', 'Lond', 'Mont', 'Osp', 'Quint', 'Rest', 'Vél', 'Zul'], ends: ['ez', 'illo', 'oño', 'ero', 'ana', 'rez', 'ina', 'ago', 'o', 'a'] },
  ZA: { stems: ['Bot', 'Ven', 'Pre', 'Kru', 'Mal', 'Nel', 'Swa', 'Ter', 'Vil', 'Moko', 'Dla', 'Ste'], ends: ['ha', 'ter', 'ger', 'an', 'son', 'rt', 'joen', 'mini', 'ena', 'yn'], particle: ['van ', 'van der ', 'du '] },
  NZ: { stems: ['Ash', 'Bay', 'Camp', 'Haw', 'Kin', 'Mcl', 'Nor', 'Rut', 'Tar', 'Wai', 'Hin', 'Pat'], ends: ['ley', 'ton', 'bell', 'ford', 'ro', 'ata', 'wood', 'by', 'ham', 'ane'] },
  IN: { stems: ['Ag', 'Bha', 'Cha', 'Des', 'Gup', 'Iyer', 'Jos', 'Kap', 'Mehr', 'Nai', 'Pat', 'Rao', 'Sin', 'Tri'], ends: ['rwal', 'ttacharya', 'ndra', 'ai', 'ta', 'hi', 'oor', 'ra', 'gh', 'edi', 'el', 'a'] },
  CN: { stems: ['Chen', 'Huang', 'Li', 'Liu', 'Wang', 'Wu', 'Xu', 'Yang', 'Zhang', 'Zhao', 'Zhou', 'Sun', 'Ma', 'Gao'], ends: [''] },
};
// 1919 and 2020 weights for the new nationalities (the sport widens later)
export const W1919_X = { IE: 1.5, PT: 0.6, FI: 0.3, DK: 0.6, NO: 0.4, PL: 0.5, MX: 0.1, CO: 0, ZA: 0.3, NZ: 0.3, IN: 0, CN: 0 };
export const W2020_X = { IE: 2, PT: 2, FI: 2.2, DK: 1.6, NO: 1.4, PL: 2, MX: 4, CO: 2, ZA: 1.4, NZ: 1.6, IN: 3, CN: 3 };

// ---- team names ----
// Words for later independents: places, ideas and speed (teams named for a place or an idea, not a person).
export const TEAM_WORDS = {
  early: ['Apex', 'Meridian', 'Vanguard', 'Pioneer', 'Zenith', 'Paragon', 'Sovereign', 'Northern Star', 'Eagle', 'Falcon', 'Lion', 'Anchor'],
  late: ['Apex', 'Meridian', 'Vanguard', 'Horizon', 'Zenith', 'Paragon', 'Aurora', 'Vortex', 'Quantum', 'Nova', 'Helix', 'Atlas', 'Orion', 'Summit', 'Velocity', 'Kinetic', 'Ascent', 'Equinox', 'Lumen', 'Torque'],
};
export const TEAM_PLACES = {
  GB: ['Brooklands', 'Silverstone', 'Donington', 'Goodwood', 'Oulton', 'Thruxton', 'Snetterton', 'Cadwell', 'Aintree', 'Cotswold', 'Pennine', 'Solent'],
  US: ['Indianapolis', 'Daytona', 'Sebring', 'Laguna', 'Riverside', 'Watkins', 'Elkhart', 'Lakeshore', 'Mesa', 'Cascade', 'Piedmont', 'Midwest'],
  FR: ['Montlhéry', 'Reims', 'Rouen', 'Magny', 'Albi', 'Lyon', 'Anjou', 'Provence', 'Rivière', 'Normandie', 'Vendée', 'Aquitaine'],
  IT: ['Monza', 'Imola', 'Mugello', 'Brescia', 'Modena', 'Torino', 'Vallelunga', 'Adriatica', 'Lombarda', 'Emilia', 'Veneta', 'Toscana'],
  DE: ['Nürburg', 'Hockenheim', 'Solitude', 'Avus', 'Sachsen', 'Rhein', 'Schwarzwald', 'Eifel', 'Bayern', 'Hansa', 'Main', 'Harz'],
  ES: ['Jarama', 'Montjuïc', 'Catalunya', 'Andalucía', 'Navarra', 'Levante', 'Castilla', 'Valencia', 'Galicia', 'Cantábrica'],
  JP: ['Suzuka', 'Fuji', 'Tsukuba', 'Sendai', 'Kansai', 'Hokkaido', 'Nagoya', 'Okayama'],
  KR: ['Yeongam', 'Incheon', 'Busan', 'Seoul', 'Taebaek'],
  _: ['Meridian', 'Coastal', 'Highland', 'Continental', 'Atlantic', 'Pacific', 'Northern', 'Southern', 'Central', 'Alpine'],
};

/* ════════════════════════════════════════════════════════
   Math Card Battle (English): problem card decks
   English version of /math-site/chu/card-battle-decks.js.
   Keep the answers and the order of cards the same as the Japanese decks.
   Every deck has 40 cards (★1 ×16, ★2 ×16, ★3 ×8).
   1 card = [★, unit, problem, answer, hint, solution, answer labels (for pairs), CPU's typical wrong answers]
   ════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var BIG = ['larger root', 'smaller root'];
  var BIG2 = ['larger', 'smaller'];
  var DIVR = ['quotient', 'remainder'];
  var TIME = ['hour', 'minute'];

  var DECKS = {};

  /* ── Lower Elementary (Grades 1–3) ── */
  DECKS['sho-low'] = {
    name: 'Lower Elementary', range: 'Grades 1–3', keys: [],
    note: 'Type your answer as a number.',
    problems: [
      // ★1
      [1, 'Addition', '8 + 5', 13, '8 needs 2 more to make 10.', '8 + 2 = 10, then the other 3 makes 13'],
      [1, 'Addition', '7 + 6', 13, '7 needs 3 more to make 10.', '7 + 3 = 10, 10 + 3 = 13'],
      [1, 'Addition', '30 + 50', 80, '3 tens and 5 tens.', '8 tens make 80'],
      [1, 'Subtraction', '13 − 8', 5, 'Split 13 into 10 and 3.', '10 − 8 = 2, 2 + 3 = 5'],
      [1, 'Subtraction', '15 − 7', 8, 'Do 10 − 7 first.', '10 − 7 = 3, 3 + 5 = 8'],
      [1, 'Subtraction', '100 − 40', 60, 'Take 4 tens away from 10 tens.', '6 tens make 60'],
      [1, 'Multiplication', '6 × 7', 42, 'The 6 times table.', '6 × 7 = 42'],
      [1, 'Multiplication', '8 × 4', 32, 'The 8 times table.', '8 × 4 = 32'],
      [1, 'Multiplication', '7 × 8', 56, 'The 7 times table.', '7 × 8 = 56'],
      [1, 'Multiplication', '0 × 9', 0, 'What is 0 times anything?', '0 × 9 = 0'],
      [1, 'Division', '24 ÷ 6', 4, 'Find □ in 6 × □ = 24.', '6 × 4 = 24, so 4'],
      [1, 'Division', '35 ÷ 5', 7, 'Find □ in 5 × □ = 35.', '5 × 7 = 35, so 7'],
      [1, 'Units', 'How many cm are in 1 m?', 100, 'One metre stick.', '1 m = 100 cm'],
      [1, 'Units', 'How many dL are in 1 L?', 10, 'How many 1 dL cups fill a 1 L jug?', '1 L = 10 dL'],
      [1, 'Time', 'How many minutes are in 1 hour?', 60, 'The long hand goes all the way round once.', '1 hour = 60 minutes'],
      [1, 'Word problems', 'There are 12 candies. You eat 5. How many are left?', 7, '"Left" means subtract.', '12 − 5 = 7'],
      // ★2
      [2, 'Addition', '38 + 27', 65, 'The ones are 8 + 7 = 15. Watch the carry.', '30 + 20 = 50, 8 + 7 = 15, 50 + 15 = 65'],
      [2, 'Subtraction', '52 − 18', 34, 'Split 18 into 10 and 8 and subtract each.', '52 − 10 = 42, 42 − 8 = 34'],
      [2, 'Subtraction', '64 − 27', 37, 'You can\'t do 4 − 7 in the ones, so borrow.', '64 − 20 = 44, 44 − 7 = 37'],
      [2, 'Multiplication', '12 × 3', 36, 'Add 10 × 3 and 2 × 3.', '30 + 6 = 36'],
      [2, 'Multiplication', '25 × 4', 100, 'Four 25s.', '25 × 4 = 100'],
      [2, 'Multiplication', '15 × 6', 90, 'Add 10 × 6 and 5 × 6.', '60 + 30 = 90'],
      [2, 'Multiplication', '23 × 4', 92, 'Add 20 × 4 and 3 × 4.', '80 + 12 = 92'],
      [2, 'Division', '17 ÷ 5', [3, 2], '5 × 3 = 15. What is left over?', '17 = 5 × 3 + 2', DIVR],
      [2, 'Division', '29 ÷ 4', [7, 1], '4 × 7 = 28. What is left over?', '29 = 4 × 7 + 1', DIVR],
      [2, 'Division', '50 ÷ 7', [7, 1], '7 × 7 = 49.', '50 = 7 × 7 + 1', DIVR],
      [2, 'Units', 'How many cm is 2 m 30 cm?', 230, '2 m is 200 cm.', '200 + 30 = 230'],
      [2, 'Time', 'What time is it 30 minutes after 9:40?', [10, 10], '40 min + 30 min = 70 min = 1 hour 10 min.', '9:40 → 10:10', TIME],
      [2, 'Time', 'What time is it 20 minutes before 4:10?', [3, 50], 'Think of 10 minutes before 4:00.', '4:10 → 4:00 → 3:50', TIME],
      [2, 'Word problems', '4 children share 28 cards equally. How many does each get?', 7, '4 × □ = 28.', '28 ÷ 4 = 7'],
      [2, 'Word problems', 'A pencil costs 60 yen. How much do 3 pencils cost?', 180, 'Three lots of 60 yen.', '60 × 3 = 180'],
      [2, 'Word problems', '3 plates with 8 peaches each, plus 5 loose peaches. How many in all?', 29, 'Count the plates first.', '8 × 3 = 24, 24 + 5 = 29'],
      // ★3
      [3, 'Addition', '146 + 275', 421, 'Line up the places and start from the ones. You carry twice.', '6 + 5 = 11, 40 + 70 = 110, 100 + 200 = 300, total 421'],
      [3, 'Addition', '478 + 365', 843, 'There are two carries.', '8 + 5 = 13, 70 + 60 = 130, 400 + 300 = 700, total 843'],
      [3, 'Subtraction', '300 − 125', 175, 'It is easier if you split 300 into 299 and 1.', '299 − 125 = 174, 174 + 1 = 175'],
      [3, 'Subtraction', '1000 − 364', 636, 'Split 1000 into 999 and 1.', '999 − 364 = 635, 635 + 1 = 636'],
      [3, 'Word problems', '30 cookies, 4 per person. How many people get some, and how many are left over?', [7, 2], '4 × 7 = 28.', '30 = 4 × 7 + 2, so 7 people get cookies and 2 are left', ['people', 'left over']],
      [3, 'Time', 'What time is it 1 hour 25 minutes after 10:50 a.m.?', [12, 15], '50 min + 25 min = 75 min = 1 hour 15 min.', '10:50 → 11:50 → 12:15', TIME],
      [3, 'Word problems', '3 juices at 120 yen each and 1 bread roll at 80 yen. How much in total?', 440, 'Work out the juice first.', '120 × 3 = 360, 360 + 80 = 440'],
      [3, 'Word problems', 'You buy 6 bags of 8 candies and eat 15. How many are left?', 33, 'First, how many are there altogether?', '8 × 6 = 48, 48 − 15 = 33']
    ]
  };

  /* ── Upper Elementary (Grades 4–6) ── */
  DECKS['sho-high'] = {
    name: 'Upper Elementary', range: 'Grades 4–6', keys: ['/', '.'],
    note: 'Type fractions like 3/4 and decimals like 0.5. Simplify your fractions.',
    problems: [
      // ★1
      [1, 'Decimals', '0.3 + 0.8', 1.1, '3 tenths and 8 tenths.', '11 tenths make 1.1'],
      [1, 'Decimals', '4.2 − 1.5', 2.7, 'Line up the decimal points and subtract.', '4.2 − 1.5 = 2.7'],
      [1, 'Decimals', '2.5 × 4', 10, 'The same as adding 2.5 four times.', '2.5 × 4 = 10'],
      [1, 'Fractions', '1/5 + 2/5', '3/5', 'Same denominator: add the numerators.', '1/5 + 2/5 = 3/5'],
      [1, 'Fractions', '3/4 − 1/4', '1/2', 'Subtract the numerators, then simplify.', '2/4 = 1/2'],
      [1, 'Factors', 'Greatest common factor of 12 and 18', 6, 'The largest number that divides both.', '12 and 18 are both divisible by 6'],
      [1, 'Order of ops', '8 + 2 × 3', 14, 'Multiply first.', '2 × 3 = 6, 8 + 6 = 14'],
      [1, 'Order of ops', '(8 + 2) × 3', 30, 'Brackets first.', '10 × 3 = 30'],
      [1, 'Shapes', 'Area of a 6 cm by 8 cm rectangle (cm²)', 48, 'Length × width.', '6 × 8 = 48'],
      [1, 'Shapes', 'Area of a triangle with base 10 cm and height 6 cm (cm²)', 30, 'Base × height ÷ 2.', '10 × 6 ÷ 2 = 30'],
      [1, 'Shapes', 'Volume of a cube with 3 cm edges (cm³)', 27, 'Edge × edge × edge.', '3 × 3 × 3 = 27'],
      [1, 'Shapes', 'Volume of a 4 cm × 5 cm × 6 cm box (cm³)', 120, 'Length × width × height.', '4 × 5 × 6 = 120'],
      [1, 'Percent', '30% of 200', 60, '30% is 0.3.', '200 × 0.3 = 60'],
      [1, 'Speed', 'At 40 km/h for 3 hours, how many km do you go?', 120, 'Distance = speed × time.', '40 × 3 = 120'],
      [1, 'Speed', 'Walking at 60 m per minute for 15 minutes, how many m do you go?', 900, 'Distance = speed × time.', '60 × 15 = 900'],
      [1, 'Ratio', '2 : 3 = 6 : □', 9, '2 times 3 is 6.', '3 × 3 = 9'],
      // ★2
      [2, 'Fractions', '2/3 + 1/4', '11/12', 'With a common denominator: 8/12 and 3/12.', '8/12 + 3/12 = 11/12'],
      [2, 'Fractions', '3/4 × 2/9', '1/6', 'Multiply tops and bottoms, then simplify.', '(3 × 2)/(4 × 9) = 6/36 = 1/6'],
      [2, 'Fractions', '4/5 ÷ 2/3', '6/5', 'Flip the second fraction and multiply.', '4/5 × 3/2 = 12/10 = 6/5'],
      [2, 'Fractions', '2 1/3 × 3/7', 1, '2 1/3 is 7/3.', '7/3 × 3/7 = 1'],
      [2, 'Decimals', '3.6 ÷ 0.4', 9, 'Multiply both by 10: 36 ÷ 4.', '36 ÷ 4 = 9'],
      [2, 'Percent', 'A 2000-yen item is 20% off. What is the sale price?', 1600, '20% off means you pay 80%.', '2000 × 0.8 = 1600'],
      [2, 'Percent', '12 out of 30 people is what percent?', 40, 'Turn 12 ÷ 30 into a percent.', '12 ÷ 30 = 0.4 = 40%'],
      [2, 'Speed', 'A car drives 120 km in 2 hours 30 minutes. What is its speed in km/h?', 48, '2 hours 30 minutes is 2.5 hours.', '120 ÷ 2.5 = 48'],
      [2, 'Speed', 'Home to the station is 1.2 km. Walking at 80 m per minute, how many minutes?', 15, '1.2 km is 1200 m.', '1200 ÷ 80 = 15'],
      [2, 'Ratio', 'Split 36 in the ratio 4 : 5. What is the smaller part?', 16, 'There are 4 + 5 = 9 parts in all.', '36 ÷ 9 = 4, 4 × 4 = 16'],
      [2, 'Shapes', 'Area of a circle with radius 5 cm (use π = 3.14)', 78.5, 'Radius × radius × 3.14.', '5 × 5 × 3.14 = 78.5'],
      [2, 'Shapes', 'Area of a trapezoid with parallel sides 4 cm and 8 cm and height 5 cm (cm²)', 30, '(Top + bottom) × height ÷ 2.', '(4 + 8) × 5 ÷ 2 = 30'],
      [2, 'Factors', 'How many factors does 24 have?', 8, 'Pair them up: 1 × 24, 2 × 12, 3 × 8, 4 × 6.', '1, 2, 3, 4, 6, 8, 12, 24: 8 factors'],
      [2, 'Order of ops', '36 − 12 ÷ 4 × 2', 30, 'Do ÷ and × first, from left to right.', '12 ÷ 4 = 3, 3 × 2 = 6, 36 − 6 = 30'],
      [2, 'Average', 'The average of 80, 70, 90 and 60 points', 75, 'Total ÷ how many.', '(80 + 70 + 90 + 60) ÷ 4 = 300 ÷ 4 = 75'],
      [2, 'Average', 'A, B and C average 70 points. D scores 90. What is the average of all 4?', 75, 'First find the total for the 3 of them.', '70 × 3 = 210, (210 + 90) ÷ 4 = 75'],
      // ★3
      [3, 'Fractions', '3/4 ÷ 0.6 × 2/5', '1/2', '0.6 as a fraction is 3/5.', '3/4 × 5/3 × 2/5 = 30/60 = 1/2'],
      [3, 'Percent', 'Cost 800 yen. Set the price for a 25% profit. Price in yen?', 1000, '1.25 times the cost.', '800 × 1.25 = 1000'],
      [3, 'Percent', 'Cost 1000 yen, price 1500 yen, sold at 20% off. Profit in yen?', 200, 'First find the selling price.', '1500 × 0.8 = 1200, 1200 − 1000 = 200'],
      [3, 'Speed', 'A path around a pond is 1200 m. A walks 70 m/min, B walks 50 m/min, from the same spot in opposite directions. Minutes until they meet?', 10, 'How many metres do they close up together each minute?', '70 + 50 = 120, 1200 ÷ 120 = 10'],
      [3, 'Ratio', 'Two brothers have money in the ratio 5 : 3. The difference is 600 yen. How much does the older one have?', 1500, 'The 2-part difference is 600 yen.', '1 part is 300 yen, 5 × 300 = 1500'],
      [3, 'Shapes', 'Area of a sector with radius 6 cm and angle 60° (use π = 3.14)', 18.84, '60/360 of the circle = 1/6.', '6 × 6 × 3.14 ÷ 6 = 18.84'],
      [3, 'Factors', 'How many 2-digit numbers can be divided by both 6 and 8?', 4, 'The least common multiple of 6 and 8 is 24.', '24, 48, 72, 96: 4 numbers'],
      [3, 'Word problems', 'Cranes and turtles: 10 animals and 28 legs in all. How many turtles?', 4, 'If they were all cranes, there would be 20 legs.', '28 − 20 = 8, each turtle adds 2 legs, so 8 ÷ 2 = 4']
    ]
  };

  /* ── Middle School (Grades 7–9) ── */
  DECKS['chu'] = {
    name: 'Middle School', range: 'Grades 7–9', keys: ['√', '−', '/', '(', ')'],
    note: 'Type negatives like −3, fractions like 1/2 and roots like 2√3.',
    problems: [
      // ★1
      [1, 'Signed numbers', '(−3) + 8', 5, 'On the number line, start at −3 and move 8 to the right.', '−3 + 8 = 5'],
      [1, 'Signed numbers', '(−6) × (−2)', 12, 'Negative × negative is positive.', '6 × 2 = 12, and the sign is +'],
      [1, 'Signed numbers', '(−15) ÷ 3', -5, 'Negative ÷ positive is negative.', '15 ÷ 3 = 5, and the sign is −'],
      [1, 'Signed numbers', '7 − (−2)', 9, 'Subtracting a negative is the same as adding.', '7 − (−2) = 7 + 2 = 9'],
      [1, 'Signed numbers', '−8 + 3 − 5', -10, 'Group the positives and the negatives.', '3 − 8 − 5 = 3 − 13 = −10'],
      [1, 'Signed numbers', '(−2)³', -8, 'Multiply (−2) three times.', '(−2) × (−2) × (−2) = 4 × (−2) = −8'],
      [1, 'Expressions', 'Value of 2x + 1 when x = 3', 7, 'Put 3 in for x.', '2 × 3 + 1 = 7'],
      [1, 'Expressions', 'Value of 3a when a = −2', -6, 'Put (−2) in for a.', '3 × (−2) = −6'],
      [1, 'Equations', 'Solve x + 5 = 12', 7, 'Move the 5 to the right side.', 'x = 12 − 5 = 7'],
      [1, 'Equations', 'Solve 3x = −18', -6, 'Divide both sides by 3.', 'x = −18 ÷ 3 = −6'],
      [1, 'Proportion', 'y = 2x. Find y when x = 4', 8, 'Put 4 in for x.', 'y = 2 × 4 = 8'],
      [1, 'Linear functions', 'Slope of y = −3x + 1', -3, 'In y = ax + b, a is the slope.', 'In y = ax + b, a is the slope. a = −3'],
      [1, 'Linear functions', 'y-intercept of y = 4x − 5', -5, 'In y = ax + b, b is the y-intercept.', 'In y = ax + b, b is the y-intercept. b = −5'],
      [1, 'Linear functions', 'For y = 3x − 2, when x goes up by 2, how much does y go up?', 6, 'Slope 3 means "when x goes up 1, y goes up 3".', 'The slope is 3, so 3 × 2 = 6'],
      [1, 'Square roots', '√49', 7, 'The positive number that squares to 49.', '7² = 49, so √49 = 7'],
      [1, 'Square roots', '√2 × √8', 4, '√a × √b = √(a × b).', '√2 × √8 = √16 = 4'],
      // ★2
      [2, 'Signed numbers', '−3²', -9, 'Only the 3 is squared. There are no brackets!', 'Only the 3 is squared. −(3 × 3) = −9'],
      [2, 'Signed numbers', '3 − 2 × (−4)', 11, 'Multiply first.', '2 × (−4) = −8, so 3 − (−8) = 11'],
      [2, 'Expressions', 'Value of x² − 2x when x = −3', 15, '(−3)² is 9. −2x is −2 × (−3).', '9 − 2 × (−3) = 9 + 6 = 15'],
      [2, 'Equations', 'Solve 2x − 7 = 5', 6, 'Move the −7 across, then divide by 2.', '2x = 12, x = 6'],
      [2, 'Equations', 'Solve 5x + 3 = 2x − 9', -4, 'Put the x terms on the left and the numbers on the right.', '5x − 2x = −9 − 3, 3x = −12, x = −4'],
      [2, 'Proportion', 'y is proportional to x, and y = −12 when x = 3. What is the constant?', -4, 'Put x = 3, y = −12 into y = ax.', '−12 = 3a, a = −4'],
      [2, 'Inverse proportion', 'y is inversely proportional to x, and y = 6 when x = 2. Find y when x = 4', 3, 'In inverse proportion, x × y stays the same.', 'x × y = 12, so y = 12 ÷ 4 = 3'],
      [2, 'Linear functions', 'Slope of the line through (0, 1) and (2, 7)', 3, 'Slope = change in y ÷ change in x.', '(7 − 1) ÷ (2 − 0) = 6 ÷ 2 = 3'],
      [2, 'Linear functions', 'y = −2x + 5. Find y when x = −3', 11, 'Put (−3) in for x. Watch the sign of −2 × (−3).', '−2 × (−3) + 5 = 6 + 5 = 11'],
      [2, 'Linear functions', 'y-intercept of the line with slope 2 through (1, 5)', 3, 'Put x = 1, y = 5 into y = 2x + b.', 'Put (1, 5) into y = 2x + b. 5 = 2 + b, b = 3'],
      [2, 'Square roots', '√((−5)²)', 5, 'Work out (−5)² first.', '(−5)² = 25, √25 = 5 (not −5!)'],
      [2, 'Square roots', 'Write √12 in the form a√b', '2√3', '12 = 4 × 3. √4 is 2.', '√12 = √(4 × 3) = 2√3', null, ['3√2', '4√3', '6']],
      [2, 'Square roots', '√18 + √8', '5√2', 'Write each one in the form a√2.', '√18 = 3√2, √8 = 2√2, so 3√2 + 2√2 = 5√2', null, ['√26', '6√2', '4√2']],
      [2, 'Quadratic eqs', 'Solve x² = 25', [5, -5], 'There are two numbers that square to 25.', 'The two numbers that square to 25 are 5 and −5', BIG],
      [2, 'Quadratic eqs', 'Solve x² − 5x + 6 = 0', [3, 2], 'Find two numbers that multiply to 6 and add to −5.', '(x − 2)(x − 3) = 0, so x = 2, 3', BIG],
      [2, 'Simultaneous eqs', 'x + y = 7\nx − y = 1', [4, 3], 'Add the two equations and y disappears.', 'Adding gives 2x = 8, x = 4, y = 7 − 4 = 3'],
      // ★3
      [3, 'Simultaneous eqs', 'y = 2x + 1\ny = −x + 7', [2, 5], 'Set the right-hand sides equal.', '2x + 1 = −x + 7, 3x = 6, x = 2, y = 5'],
      [3, 'Simultaneous eqs', '3x + 2y = 4\nx + 2y = −4', [4, -4], 'Subtract the second equation from the first and y disappears.', 'Subtracting gives 2x = 8, x = 4, 4 + 2y = −4, y = −4'],
      [3, 'Simultaneous eqs', 'Apples cost 80 yen and pears 120 yen. 10 fruits in all cost 1000 yen. How many pears?', 5, 'If there are x pears, there are (10 − x) apples.', '80(10 − x) + 120x = 1000, 800 + 40x = 1000, x = 5'],
      [3, 'Linear functions', 'The line y = ax + b passes through (1, 3) and (3, −1). Find a and b', [-2, 5], 'Find the slope a first, then put in a point to get b.', 'a = (−1 − 3) ÷ (3 − 1) = −2, 3 = −2 + b, b = 5', ['a', 'b']],
      [3, 'Linear functions', 'Where do y = x + 3 and y = −2x + 6 cross?', [1, 4], 'The crossing point solves both equations.', 'x + 3 = −2x + 6, 3x = 3, x = 1, y = 4'],
      [3, 'Quadratic eqs', 'Use the quadratic formula:\nx² + 3x + 1 = 0', ['(−3 + √5)/2', '(−3 − √5)/2'], 'x = (−b ± √(b² − 4ac)) / 2a, with a = 1, b = 3, c = 1.', 'b² − 4ac = 9 − 4 = 5, so x = (−3 ± √5)/2', BIG,
        [['(3 + √5)/2', '(3 − √5)/2'], ['(−3 + √13)/2', '(−3 − √13)/2']]],
      [3, 'Quadratic eqs', 'Use the quadratic formula:\nx² − 4x + 1 = 0', ['2 + √3', '2 − √3'], 'Put a = 1, b = −4, c = 1 into the formula.', 'x = (4 ± √12)/2 = (4 ± 2√3)/2 = 2 ± √3', BIG,
        [['4 + √3', '4 − √3'], ['2 + √5', '2 − √5']]],
      [3, 'Square roots', '√((1 − √2)²)', '√2 − 1', 'Is 1 − √2 positive or negative? √(a²) = |a|.', '1 − √2 is negative, so |1 − √2| = √2 − 1', null, ['1 − √2', '1 + √2']]
    ]
  };

  /* ── High School ── */
  DECKS['ko'] = {
    name: 'High School', range: 'Algebra to Calculus', keys: ['√', '−', '/', '(', ')'],
    note: 'Type fractions like 1/2 and roots like √3/2.',
    problems: [
      // ★1
      [1, 'Quadratics', 'Vertex of y = (x − 2)² + 3', [2, 3], 'The vertex of y = (x − p)² + q is (p, q).', 'The vertex is (2, 3)'],
      [1, 'Quadratics', 'x-coordinates where y = x² − 4 meets the x-axis', [2, -2], 'Solve x² − 4 = 0.', 'x² = 4, so x = ±2', BIG2],
      [1, 'Trigonometry', 'sin 30°', '1/2', 'The sides of a 30°-60°-90° triangle are in the ratio 1 : √3 : 2.', 'sin 30° = 1/2'],
      [1, 'Trigonometry', 'tan 45°', 1, 'A right isosceles triangle.', 'tan 45° = 1/1 = 1'],
      [1, 'Exp & log', '2⁵', 32, 'Multiply 2 five times.', '2 × 2 × 2 × 2 × 2 = 32'],
      [1, 'Exp & log', 'log₂ 8', 3, '2 to what power is 8?', '2³ = 8, so 3'],
      [1, 'Exp & log', 'log₃ 81', 4, '3 to what power is 81?', '3⁴ = 81, so 4'],
      [1, 'Exp & log', '8 to the power 1/3', 2, 'The number whose cube is 8.', '2³ = 8, so 2'],
      [1, 'Sequences', '10th term of the arithmetic sequence 3, 7, 11, …', 39, 'a + (n − 1)d.', '3 + 9 × 4 = 39'],
      [1, 'Sequences', 'Sum of k² for k = 1 to 5', 55, '1 + 4 + 9 + 16 + 25.', '1 + 4 + 9 + 16 + 25 = 55'],
      [1, 'Counting', '₅C₂', 10, '5 × 4 ÷ (2 × 1).', '20 ÷ 2 = 10'],
      [1, 'Probability', 'Probability that one die shows a factor of 6', '2/3', 'The factors of 6 are 1, 2, 3, 6.', '4/6 = 2/3'],
      [1, 'Derivatives', 'f(x) = x³. Find f′(2)', 12, 'f′(x) = 3x².', '3 × 2² = 12'],
      [1, 'Derivatives', 'Slope of the tangent to y = x² at x = 3', 6, 'y′ = 2x.', '2 × 3 = 6'],
      [1, 'Integrals', '∫₀¹ 3x² dx', 1, 'An antiderivative of 3x² is x³.', '[x³]₀¹ = 1 − 0 = 1'],
      [1, 'Complex numbers', 'i² (i is the imaginary unit)', -1, 'The definition of the imaginary unit.', 'i² = −1'],
      // ★2
      [2, 'Quadratics', 'Vertex of y = x² − 6x + 5', [3, -4], 'Complete the square.', 'y = (x − 3)² − 4, so (3, −4)'],
      [2, 'Quadratics', 'x-coordinates where y = x² − 2x − 3 meets the x-axis', [3, -1], 'Factorise.', '(x − 3)(x + 1) = 0, so x = 3, −1', BIG2],
      [2, 'Quadratics', 'Maximum value of y = −x² + 4x', 4, 'Complete the square: −(x − 2)² + 4.', 'Maximum value 4 at x = 2'],
      [2, 'Quadratics', 'Values of k for which x² + kx + 4 = 0 has a repeated root', [4, -4], 'Discriminant D = k² − 16 = 0.', 'k² = 16, so k = ±4', BIG2],
      [2, 'Trigonometry', 'sin 120°', '√3/2', 'sin(180° − θ) = sin θ.', 'sin 120° = sin 60° = √3/2', null, ['−√3/2', '1/2']],
      [2, 'Trigonometry', 'sin θ = 3/5 (θ acute). Find cos θ', '4/5', 'sin²θ + cos²θ = 1.', 'cos²θ = 1 − 9/25 = 16/25, and cos θ > 0, so 4/5'],
      [2, 'Exp & log', 'log₁₀ 2 + log₁₀ 5', 1, 'log a + log b = log ab.', 'log₁₀ 10 = 1'],
      [2, 'Exp & log', 'Solve 2ˣ = 1/8', -3, '1/8 is 2 to what power?', '1/8 = 2⁻³, so x = −3'],
      [2, 'Sequences', '5th term of the geometric sequence 2, 6, 18, …', 162, 'a × rⁿ⁻¹.', '2 × 3⁴ = 162'],
      [2, 'Sequences', 'Sum of the first 10 terms of the arithmetic sequence with first term 5 and difference 3', 185, 'n{2a + (n − 1)d}/2.', '10 × (10 + 27) ÷ 2 = 185'],
      [2, 'Counting', 'Ways to choose 3 people from 4 boys and 3 girls (7 people)', 35, '₇C₃.', '7 × 6 × 5 ÷ 6 = 35'],
      [2, 'Probability', 'Probability that two dice add up to 7', '1/6', '36 outcomes in all. 6 of them add to 7.', '6/36 = 1/6'],
      [2, 'Probability', 'Take 2 balls from 3 red and 2 white. Probability both are red', '3/10', '₃C₂ / ₅C₂.', '3 ÷ 10 = 3/10'],
      [2, 'Derivatives', 'Minimum value of y = x² − 4x + 1', -3, 'Find the x where the derivative is 0.', 'y′ = 2x − 4 = 0 at x = 2, y = 4 − 8 + 1 = −3'],
      [2, 'Integrals', '∫₀² (x² + 1) dx', '14/3', 'Use x³/3 + x.', '[x³/3 + x]₀² = 8/3 + 2 = 14/3'],
      [2, 'Complex numbers', '(2 + i)(2 − i)', 5, '(a + b)(a − b) = a² − b².', '4 − i² = 4 + 1 = 5'],
      // ★3
      [3, 'Trigonometry', 'In triangle ABC, a = 7, b = 5, c = 3. How many degrees is angle A?', 120, 'Law of cosines: cos A = (b² + c² − a²)/2bc.', 'cos A = (25 + 9 − 49)/30 = −1/2, so A = 120°'],
      [3, 'Exp & log', 'log₂ 3 × log₃ 8', 3, 'Change of base: log₂ 3 × log₃ 8 = log₂ 8.', 'log₂ 8 = 3'],
      [3, 'Exp & log', 'Solve 4ˣ − 6·2ˣ + 8 = 0', [2, 1], 'Let t = 2ˣ. Then t² − 6t + 8 = 0.', '(t − 2)(t − 4) = 0, 2ˣ = 2 or 4, so x = 1, 2', BIG2],
      [3, 'Sequences', 'Find n so that 1 + 3 + 5 + … + (2n − 1) = 100', 10, 'The first n odd numbers add up to n².', 'n² = 100, so n = 10'],
      [3, 'Probability', 'Roll a die 3 times. Probability of at least one 6', '91/216', 'The opposite of "no 6 at all".', '1 − (5/6)³ = 1 − 125/216 = 91/216'],
      [3, 'Derivatives', 'Local maximum value of f(x) = x³ − 3x', 2, 'f′(x) = 3x² − 3 = 0 at x = ±1.', 'At x = −1 the local maximum is −1 + 3 = 2'],
      [3, 'Derivatives', 'Maximum of f(x) = x³ − 6x² + 9x on 0 ≤ x ≤ 4', 4, 'f′(x) = 3(x − 1)(x − 3). Compare the turning points and the ends.', 'f(1) = 4, f(3) = 0, f(0) = 0, f(4) = 4, so the maximum is 4'],
      [3, 'Integrals', 'Area enclosed by y = x² and y = x', '1/6', '∫₀¹ (x − x²) dx.', '1/2 − 1/3 = 1/6']
    ]
  };

  /* ── University ── */
  DECKS['dai'] = {
    name: 'University', range: 'Years 1–2', keys: ['√', '−', '/', 'π', 'e', '(', ')'],
    note: 'Type fractions like 7/2, roots like √π, pi as π and Euler\'s number as e.',
    problems: [
      // ★1
      [1, 'Linear algebra', 'Determinant of\n( 2  1 )\n( 3  4 )', 5, 'ad − bc.', '2 × 4 − 1 × 3 = 5'],
      [1, 'Linear algebra', '(1, 2, 3)·(4, 5, 6) (dot product)', 32, 'Multiply matching entries and add.', '4 + 10 + 18 = 32'],
      [1, 'Linear algebra', 'Eigenvalues of\n( 3  0 )\n( 0  5 )', [5, 3], 'The eigenvalues of a diagonal matrix are its diagonal entries.', 'The eigenvalues are 5 and 3', BIG2],
      [1, 'Linear algebra', 'Trace of the 3 × 3 identity matrix', 3, 'The sum of the diagonal entries.', '1 + 1 + 1 = 3'],
      [1, 'Calculus', 'lim(x→0) (sin x)/x', 1, 'A famous limit.', 'sin x / x → 1'],
      [1, 'Calculus', '∫₀^π sin x dx', 2, 'An antiderivative is −cos x.', '[−cos x]₀^π = 1 − (−1) = 2'],
      [1, 'Calculus', 'lim(n→∞) (1 + 1/n)ⁿ', 'e', 'The definition of Euler\'s number.', 'The limit is e', null, ['1', '2']],
      [1, 'Calculus', 'f(x, y) = x²y. Value of ∂f/∂x at (1, 2)', 4, 'Treat y as a constant and differentiate in x.', '∂f/∂x = 2xy = 2 × 1 × 2 = 4'],
      [1, 'Number theory', '17 mod 5', 2, 'The remainder when 17 is divided by 5.', '17 = 5 × 3 + 2'],
      [1, 'Number theory', 'φ(10) (Euler\'s totient)', 4, 'Numbers from 1 to 10 coprime to 10.', '1, 3, 7, 9: 4 numbers'],
      [1, 'Group theory', 'Order of the symmetric group S₃', 6, 'The number of permutations of 3 letters.', '3! = 6'],
      [1, 'Prob & stats', 'Expected value of one die roll', '7/2', '(1 + 2 + … + 6)/6.', '21/6 = 7/2'],
      [1, 'Prob & stats', 'Mean of the binomial distribution B(10, 0.3)', 3, 'np.', '10 × 0.3 = 3'],
      [1, 'Series', '1 + 1/2 + 1/4 + 1/8 + …', 2, 'A geometric series with first term 1 and ratio 1/2.', '1/(1 − 1/2) = 2'],
      [1, 'Complex analysis', '|3 + 4i|', 5, '√(real part² + imaginary part²).', '√(9 + 16) = 5'],
      [1, 'Complex analysis', 'e^(iπ)', -1, 'Euler\'s formula: e^(iθ) = cos θ + i sin θ.', 'cos π + i sin π = −1'],
      // ★2
      [2, 'Linear algebra', 'Eigenvalues of\n( 2  1 )\n( 1  2 )', [3, 1], 'Characteristic polynomial (2 − λ)² − 1 = 0.', 'λ = 3, 1', BIG2],
      [2, 'Linear algebra', 'Eigenvalues of\n( 4  1 )\n( 2  3 )', [5, 2], 'Trace 7, determinant 10.', 'λ² − 7λ + 10 = 0, so λ = 5, 2', BIG2],
      [2, 'Linear algebra', 'Rank of\n( 1  2  3 )\n( 2  4  6 )\n( 1  1  1 )', 2, 'Row 2 is twice row 1.', 'There are 2 independent rows, so 2'],
      [2, 'Linear algebra', '(1,1) entry of the inverse of\n( 1  2 )\n( 3  4 )', -2, 'Inverse = (1/det) × adjugate. det = −2.', '(1/−2) × 4 = −2'],
      [2, 'Linear algebra', 'Determinant of\n( 1  1  0 )\n( 0  1  1 )\n( 1  0  1 )', 2, 'Expand along the first row.', '1 × (1 − 0) − 1 × (0 − 1) + 0 = 2'],
      [2, 'Calculus', '∫₀¹ 4/(1 + x²) dx', 'π', '(arctan x)′ = 1/(1 + x²).', '4 × arctan 1 = 4 × π/4 = π', null, ['π/4', '2π']],
      [2, 'Calculus', '∫₀¹ x eˣ dx', 1, 'Integration by parts: ∫ x eˣ dx = x eˣ − eˣ.', '[x eˣ − eˣ]₀¹ = (e − e) − (0 − 1) = 1'],
      [2, 'Calculus', 'lim(x→0) (1 − cos x)/x²', '1/2', 'cos x ≈ 1 − x²/2 (Taylor series).', '(x²/2)/x² → 1/2'],
      [2, 'Number theory', 'gcd(84, 36)', 12, 'The Euclidean algorithm.', '84 = 36 × 2 + 12, 36 = 12 × 3, so 12'],
      [2, 'Number theory', 'Solve 7x ≡ 1 (mod 11) for x (0–10)', 8, 'Find the inverse of 7.', '7 × 8 = 56 = 55 + 1'],
      [2, 'Number theory', 'φ(100)', 40, 'φ(n) = n(1 − 1/p)…, and 100 = 2² × 5².', '100 × 1/2 × 4/5 = 40'],
      [2, 'Group theory', 'Order of the element 8 in ℤ/12ℤ', 3, 'How many 8s make a multiple of 12?', '8 × 3 = 24 ≡ 0'],
      [2, 'Group theory', 'Number of generators of a cyclic group of order 8', 4, 'The number of generators is φ(8).', '1, 3, 5, 7: 4 generators'],
      [2, 'Prob & stats', 'Variance of one die roll', '35/12', 'E[X²] − (E[X])².', '91/6 − 49/4 = 182/12 − 147/12 = 35/12'],
      [2, 'Series', 'Sum of 1/(n(n + 1)) from n = 1 to ∞', 1, 'Split into 1/n − 1/(n + 1) (partial fractions).', 'The middle terms cancel, leaving 1'],
      [2, 'Complex analysis', 'Real part of the solution of z² = i with positive real part', '√2/2', 'i = e^(iπ/2). Its square root is e^(iπ/4).', 'e^(iπ/4) = cos 45° + i sin 45°, so the real part is √2/2', null, ['1/2', '√3/2']],
      // ★3
      [3, 'Linear algebra', 'Determinant of\n( 2  1  1 )\n( 1  2  1 )\n( 1  1  2 )', 4, 'Expand along the first row.', '2(4 − 1) − 1(2 − 1) + 1(1 − 2) = 6 − 1 − 1 = 4'],
      [3, 'Calculus', '∫₋∞^∞ e^(−x²) dx', '√π', 'The Gaussian integral. Square it and use polar coordinates.', 'I² = π, so I = √π', null, ['π', '√(2π)']],
      [3, 'Calculus', '∫₀^(π/2) sin²x dx', 'π/4', 'sin²x = (1 − cos 2x)/2.', '[x/2 − sin 2x/4]₀^(π/2) = π/4', null, ['π/2', '1/2']],
      [3, 'Number theory', '3¹⁰⁰ mod 7', 4, '3⁶ ≡ 1 (mod 7) (Fermat\'s little theorem).', '100 = 6 × 16 + 4, 3⁴ = 81 ≡ 4'],
      [3, 'Number theory', 'How many x (0–14) satisfy x² ≡ 1 (mod 15)?', 4, 'Split into mod 3 and mod 5 (Chinese remainder theorem).', 'x ≡ ±1 (mod 3) and x ≡ ±1 (mod 5) give 2 × 2 = 4 (1, 4, 11, 14)'],
      [3, 'Group theory', 'Number of elements of order 3 in S₄', 8, 'Elements of order 3 are 3-cycles.', '4 ways to choose 3 letters × 2 directions = 8'],
      [3, 'Prob & stats', 'Roll a die until you get a 6. Expected number of rolls', 6, 'A geometric distribution with success probability p has mean 1/p.', '1 ÷ (1/6) = 6'],
      [3, 'Series', 'Sum of n/2ⁿ from n = 1 to ∞', 2, 'Put x = 1/2 into Σ n xⁿ = x/(1 − x)².', '(1/2) ÷ (1/2)² = 2']
    ]
  };

  root.CB_DECKS = DECKS;
  if (typeof module !== 'undefined' && module.exports) module.exports = DECKS;
})(typeof window !== 'undefined' ? window : globalThis);

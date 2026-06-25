//TIME // // //

let time = 0; //in military time from real time (from 0-23)

function get24HourTime(timeElapsed) {
  return int(timeElapsed) % 24; //normalises time (returns the reminder of 0-23)
}

function get12HourTime(timeElapsed) {
  let hour24 = get24HourTime(timeElapsed);
  return hour24 % 12; //normalises time (returns the reminder of 0-11)
}

function isTimePM(timeElapsed) {
  let hour24 = get24HourTime(timeElapsed);
  return hour24 >= 12;
}

//LIGHT // // //

//environment background
let brightBackground;
let darkBackground;
let flashlightBackground;

//flashlight
let onFlashlightMode = false;
let flashlight_radius = 50;

function setupEnvironmentBackground() {
  //default environment colours
  brightBackground = color(29, 162, 216);
  darkBackground = color(6, 66, 115);

  //flashlight settings
  pixelDensity(1); // keeps offscreen math simple
  flashlightBackground = createGraphics(width, height);
  flashlightBackground.pixelDensity(1);
}

function getEnvironmentLightColor(timeElapsed) {
  //gets the time
  let t = get12HourTime(timeElapsed) / 12;

  //makes the color
  let c;
  let actualDark = color(darkBackground.levels[0], darkBackground.levels[1], darkBackground.levels[2], (255 * 0.95));
  let lightDark = color(darkBackground.levels[0], darkBackground.levels[1], darkBackground.levels[2], 0);
  if (isTimePM(timeElapsed)) c = lerpColor(lightDark, actualDark, t);
  else c = lerpColor(actualDark, lightDark, t);
  
  return c;
}

function drawEnvironmentLight(timeElapsed) {
  let c = getEnvironmentLightColor(timeElapsed);
  
  //shades over the canvas
  rectMode(CENTER);
  noStroke();
  fill(c);
  rect(width/2, height/2, width, height);
}

function drawFlashlightMode(timeElapsed, radius) {
  let c = getEnvironmentLightColor(timeElapsed)

  //mouse positions
  let mx = constrain(mouseX, 0, width);
  let my = constrain(mouseY, 0, height);

  //environmental lighting background
  flashlightBackground.clear();
  flashlightBackground.noStroke();
  flashlightBackground.fill(c);

  flashlightBackground.beginShape();

  //outer contour
  flashlightBackground.vertex(0, 0);
  flashlightBackground.vertex(width, 0);
  flashlightBackground.vertex(width, height);
  flashlightBackground.vertex(0, height);
  flashlightBackground.vertex(0, 0);

  //inner contour
  flashlightBackground.beginContour();
  let N = 64; // smoother circle
  for (let i = 0; i < N; i++) {
    let a = (i / N) * TWO_PI;
    let x = mx + radius * cos(a);
    let y = my - radius * sin(a);
    flashlightBackground.vertex(x, y);
  }
  flashlightBackground.endContour();

  flashlightBackground.endShape(CLOSE);

  //flashlight focus
  flashlightBackground.ellipseMode(CENTER);
  flashlightBackground.noStroke();
  flashlightBackground.fill(255, 255, 0, 255 * 0.15);
  let diameter = radius * 2;
  flashlightBackground.ellipse(mx, my, diameter, diameter);

  //creates the flashlight background
  imageMode(CENTER);
  image(flashlightBackground, width/2, height/2);
}

//FISH // // //

class Fish {
  constructor(x, y, bodyLen, bodyH, bodyCol, wiggleSpeed, moveSpeed, hideDuration, fadeDuration) {
    this.x = x;
    this.y = y;
    
    //body
    this.bodyLen = bodyLen;
    this.bodyH = bodyH;
    this.wiggleSpeed = wiggleSpeed;
    this.bodyCol = bodyCol;

    this.totalBodyLen = this.bodyLen * 1.35;
    
    //movement
    this.dir = random(1) < 0.5 ? 1 : -1; //direction that the fish is facing

    this.moveSpeedX = moveSpeed * this.dir;
    this.moveSpeedY = moveSpeed * this.dir;
    
    this.moveSpeedY *= random(1) < 0.5 ? 1 : -1; //whether or not the fish goes up or down
    this.canMoveY = random(1) < 0.5 ? true : false;
    this.movementLimited = true;

    //hide interaction
    this.hideDuration = hideDuration;
    this.fadeDuration = fadeDuration;
    this.lastTimeRecorded = millis();
    this.isHiding = false;
    this.bodyColA = 255; //the alpha or opacity of the fish
  }
  
  display() {
    push();
    translate(this.x, this.y);
    scale(this.dir, 1);

    // Tail wiggle
    let t = millis() * 0.001;
    let wiggle = sin(t * TWO_PI * this.wiggleSpeed) * (this.bodyH * 0.15);

    noStroke();

    // Body (ellipse)
    fill(this.bodyCol.levels[0], this.bodyCol.levels[1], this.bodyCol.levels[2], this.bodyColA);
    ellipse(0, 0, this.bodyLen, this.bodyH);

    // Tail (triangle) – hinged at back of body
    let tailX = -this.bodyLen * 0.5;
    let tailW = this.bodyLen * 0.35;
    let tailH = this.bodyH * 0.9;
    push();
    translate(tailX, 0);
    // wiggle the tail around its root
    rotate(radians(wiggle));
    triangle(0, 0, -tailW, -tailH * 0.5, -tailW, tailH * 0.5);
    pop();

    // Eye
    let eyeX = this.bodyLen * 0.35;
    let eyeD = this.bodyH * 0.22;
    let eyeY = -this.bodyH * 0.12;

    noStroke();

    fill(255, 255, 255, this.bodyColA);
    ellipse(eyeX, eyeY, eyeD, eyeD); // explicit width/height

    fill(0, 0, 0, this.bodyColA);
    ellipse(eyeX + eyeD * 0.15, eyeY, eyeD * 0.45, eyeD * 0.45);

    pop();
  }
  
  move() {
    if (this.bodyColA <= 1) return; //does not move when the opacity is low

    //makes the movement
    this.x += this.moveSpeedX;
    if (this.canMoveY) this.y += this.moveSpeedY;
    
    if (!this.movementLimited) return;
    
    //keeps the movement within the bounds
    let halfBodyLen = this.bodyLen / 2;
    let halfBodyH = this.bodyH / 2;
    let tailLen = this.bodyLen * 0.35;
    
    let xBounds = halfBodyLen + tailLen;
    let yBounds = halfBodyH;
    if (this.x < xBounds || this.x > width - xBounds) {
      this.moveSpeedX *= -1;
      this.dir *= -1;
      this.canMoveY = random(1) < 0.5 ? true : false;
    }
    
    if (this.y < yBounds || this.y > height - yBounds)
          this.moveSpeedY *= -1;
        
    //ensures that the fish is within the bounds
    this.x = constrain(this.x, xBounds, width - xBounds);
    this.y = constrain(this.y, yBounds, height - yBounds);
  }

  applyMouseRepulsion(influenceSize) {
    let mx = constrain(mouseX, 0, width);
    let my = constrain(mouseY, 0, height);
    
    //gets the directions
    let dx = this.x - mx;
    let dy = this.y - my;
    let d2 = dx*dx + dy*dy;
    let r = Math.sqrt(d2);

    //gets the area of influence
    let effectiveByHeight = (influenceSize + this.bodyH) / 2;
    let effectiveByWidth = (influenceSize + this.totalBodyLen) / 2;
    
    if (r > 0 && (r < effectiveByHeight || r < effectiveByWidth)) {
      //fish is facing left or right towards the flashlight
      if (dx > 0 && this.dir != 1 ||
          dx < 0 && this.dir != -1) {
            this.dir *= -1;
            this.moveSpeedX *= -1;
      }

      //fish is approaching up or down towards the flashlight
      if (dy > 0 && this.moveSpeedY < 0 || 
          dy < 0 && this.moveSpeedY > 0) {
            this.moveSpeedY *= -1;
      }
    }
  }

  goIntoHiding() {
    this.isHiding = true;
    
    //records the time of when it should hide
    if (this.bodyColA == 0 || this.bodyColA == 255) this.lastTimeRecorded = millis();
  }

  intoHiding() {
    if (!this.isHiding || this.bodyColA == 0) return;

    //lerps opacity to zero
    let currentTime = (millis() - this.lastTimeRecorded) / 1000;
    let colA = lerp(255, 0, currentTime / this.fadeDuration);
    this.bodyColA = constrain(colA, 0, 255);

    if (this.bodyColA <= 0) this.lastTimeRecorded = millis();
  }

  duringHiding() {
    if (!this.isHiding || this.bodyColA > 0) return;

    //checks the hide duration
    let currentTime = (millis() - this.lastTimeRecorded) / 1000;
    if (currentTime > this.hideDuration) {
      this.isHiding = false;
      this.lastTimeRecorded = millis();
    }
  }

  outOfHiding() {
    if (this.isHiding || this.bodyColA >= 255) return;

    //lerps opacity to be fully visible
    let currentTime = (millis() - this.lastTimeRecorded) / 1000;
    let colA = lerp(0, 255, currentTime / this.fadeDuration);
    this.bodyColA = constrain(colA, 0, 255);
  }
}

//fish population
let fishes = [];
let leaveFishes = [];
let haveResetFishPopulation = false;

//mouse repulsion
let fishMouseRepulsion = flashlight_radius * 2;

function generateFish(timeElapsed) {
  let x = width / 2;
  let y = height / 2;

  let bodyLen = 50;
  let bodyH = 30;
  let bodyCol = isTimePM(timeElapsed) ? color(255, 0, 0) : color(0, 255, 0);

  let speed = random(2, 2.5);
  let wiggleSpeed = speed;
  let moveSpeed = speed;
  
  let hideDuration = random(3, 4);
  let fadeDuration = 0.1;

  return new Fish(x, y, bodyLen, bodyH, bodyCol, wiggleSpeed, moveSpeed, hideDuration, fadeDuration);
}

function drawFish(fish) {
  //hide interaction
  fish.intoHiding();
  fish.duringHiding();
  fish.outOfHiding();

  //flashlight interaction
  if (onFlashlightMode) fish.applyMouseRepulsion(fishMouseRepulsion);
  
  //movement
  fish.display();
  fish.move();
}

function resetFishPopulation(leaveOneBehind = false) {
  //put all fishes in the canvas into the leavingFishes array
  let tempFish;
  if (leaveOneBehind) {
    tempFish = fishes[0];

    for (let i = 1; i < fishes.length; i++) 
      leaveFishes.push(fishes[i]);
  }
  else {
    for (let i = 0; i < fishes.length; i++) 
      leaveFishes.push(fishes[i]);
  }

  //reset fishes array
  fishes = [];
  if (leaveOneBehind) fishes.push(tempFish);

  //set all leaving fishes to be able to move out of the canvas
  for (const f of leaveFishes) {
    f.movementLimited = false;
  }
}

function populateFishes(timeElapsed) {
  //finds the number of fishes needed
  let targetFishes;
  let h = get12HourTime(timeElapsed);
  if (h == 0) {
    //gets rid of the fishes for the midday and midnight hours
    if (!haveResetFishPopulation) {
      haveResetFishPopulation = true;
      resetFishPopulation();
    }
    targetFishes = 12;
  }
  else {
    //resets fishes to start at the hour 1
    if (haveResetFishPopulation) {
      haveResetFishPopulation = false;
      resetFishPopulation(true);
    }
    targetFishes = h;
  }
  
  //adds the fishes to the scene
  if (fishes.length < targetFishes) 
    fishes.push(generateFish(timeElapsed));
}

//SOUND // // //

let flashlightClickSfx;
let waterSplashSfx;
let underwaterAmbience;

//IMAGES // // //

let seaweedImg;
let rockImg;

function showSeaweedImg(amt) {
  imageMode(CENTER);
  for (let i = 1; i < (amt + 1); i++) {
    let x = width * (i / (amt + 1));
    image(seaweedImg, x, height * (3/5));
  }
}

function showRockImg() {
  let fraction = 0.45;

  // keep the original image's aspect ratio
  let targetH = height * fraction;
  let aspect = rockImg.width / rockImg.height;
  let targetW = targetH * aspect;

  //create the images
  imageMode(CENTER);
  image(rockImg, 0, height, targetW, targetH); //left side
  image(rockImg, width, height, targetW, targetH); //right side
}

//PROCESSING // // //

function preload() {
  //load sounds
  flashlightClickSfx = loadSound("sounds/flashlight.mp3")
  waterSplashSfx = loadSound("sounds/waterSplash.mp3")
  underwaterAmbience = loadSound("sounds/underwaterAmbience.mp3")

  //load images
  seaweedImg = loadImage("images/seaweed.png");
  rockImg = loadImage("images/rock.png");
}

function setup() {
  createCanvas(600, 400);
  
  setupEnvironmentBackground();
  underwaterAmbience.play();
}

function draw() {
  //makes the time
  time = hour();

  //displays environment
  background(brightBackground);
  showRockImg();
  showSeaweedImg(3);

  //loops the underwater ambience when at least one fish is not hiding
  if (!underwaterAmbience.isPlaying()) {
    let allFishesHiding = true;
    for (const f of fishes) {
      if (!f.isHiding) {
        allFishesHiding = false;
        break;
      }
    }
    
    if (!allFishesHiding) underwaterAmbience.play();
  }
  
  //populates the fishes on the canvas
  populateFishes(time);
  
  //draws the fishes
  for (const f of fishes) drawFish(f);
  
  //deletes the fishes that are leaving
  let deleteLeaveFishes = true;
  for (const f of leaveFishes) {
    drawFish(f);
    
    //whether or not all the fishes are outside the boundary
    if (f.x >= 0 && f.x <= width && f.y >= 0 && f.y <= height) 
      deleteLeaveFishes = false;
  }
  if (deleteLeaveFishes && leaveFishes.length > 0) leaveFishes = [];
  
  //draws the environmental lights
  if (onFlashlightMode) drawFlashlightMode(time, flashlight_radius);
  else drawEnvironmentLight(time);
}

function keyPressed() {
  if (key != ' ') return;

  //set up the hide interaction sounds
  waterSplashSfx.play();
  underwaterAmbience.stop();

  //fishes go into hiding
  for (const f of fishes) f.goIntoHiding()
  for (const f of leaveFishes) f.goIntoHiding()
}

function mousePressed() {
  //makes the flashlight interaction
  flashlightClickSfx.play();
  onFlashlightMode = !onFlashlightMode;
}

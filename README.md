# Super.js


Super.js is a helper library for cleaner OOP JavaScript.
It allows you to use classes in a way closer to what you are familliar to in
Python or Java.


### Example

```javascript

declareClass(
    function Mammal(hasHair, legs, arms, canSee) {
        this._hasHair = hasHaid;
        this._legs = legs;
        this._arms = arms;
        this._canSee = canSee;
    },
    
    function eat(food) {
        alert("Om nom nom...");
    },
    
    function sleep() {
        alert("Z Z Z z z z . . .");
    }
);

declareClass(
    function Dog(onLeash) {
        this._super.constructor(true, 4, 0, true);
        this._onLeash = onLeash;
    },
    
    extend(Mammal),
    
    function eat(food) {
        if (food.isDogFood()) {
            return this._super.eat(food);
        } else {
            throw "up";
        }
    }
);

declareClass(
    function Cat(canSee) {
        this._super.constructor(true, 4, 0, canSee);
    },
    
    extend(Mammal)
);

declarClass(
    function BabyCat(mommy) {
        this._super.constructor(false);
        this._mommy = mommy;
    },
    
    extend(Cat),
    
    function eat(food) {
        if (food.isFromMotherCat()) {
            alert("Meaaaw nom nom...");
        } else {
            throw "NO!";
        }
    }
);

```

Use these as usual:

```javascript

var myDog = new Dog(true);
myDog.eat(someFood);

var myCat = new Cat(true);
var myBabyCat = new BabyCat(myCat);
while(isDay()) {
    myBabyCat.sleep();
}

```


### Syntax

```

declareClass(
    function <ConstructorName>(<ContructorParams>) {
        <ConstructorBody>
    },
    
    [extend(<BaseClass>),]
    
    [function <Method1Name>(<Method1Params>) {
        <Method1Body>
    },]
    
    [function <Method2Name>(<Method2Params>) {
        <Method2Body>
    },]
    
    ...
);

```


### this._super

```javascript

this._super.constructor(...);   // Calls super's constructor.
this._super.<MethodName>(...)   // Calls a super method.

```


### Additional notes

Feel free to fork / contribute / freely use in your own project.


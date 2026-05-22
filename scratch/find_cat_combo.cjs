const categories = {
  "iphone": 27515770.98,
  "mac": 4919347,
  "ipad": 10526238,
  "apple watch": 2538595,
  "sim": 0,
  "btb": 2650039,
  "btbapple": 3894862.25,
  "selling expense": 0,
  "other": 492372,
  "tablet": 0,
  "smartphone": 0,
  "diy": 0
};

const target = 51767335;

// Find all subsets of categories and check if their sum is close to target
const keys = Object.keys(categories);

function findSubsets(index, currentSum, currentSubset) {
  if (Math.abs(currentSum - target) < 10) {
    console.log(`MATCH FOUND (within 10 Baht):`);
    console.log("Subset:", currentSubset);
    console.log("Sum:", currentSum);
    console.log("Diff:", currentSum - target);
  }

  for (let i = index; i < keys.length; i++) {
    const key = keys[i];
    const val = categories[key];
    if (val > 0) {
      findSubsets(i + 1, currentSum + val, [...currentSubset, key]);
    }
  }
}

findSubsets(0, 0, []);

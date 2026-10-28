export const multipleMongooseToObject = (mongooseArray) => {
  return mongooseArray.map((mongoose) => mongoose.toObject());
};

export const mongoToObject = (mongooseObject) => {
  return mongooseObject ? mongooseObject.toObject() : mongooseObject;
};

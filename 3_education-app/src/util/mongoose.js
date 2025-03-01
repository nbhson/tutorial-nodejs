module.exports = {
  multipleMongooseToObject: (mongooseArray) => {
    return mongooseArray.map((mongoose) => mongoose.toObject());
  },
  mongoToObject: (mongooseArray) => {
    return mongooseArray ? mongooseArray.toObject() : mongooseArray;
  },
};

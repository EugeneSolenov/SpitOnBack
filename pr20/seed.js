require("dotenv").config({ quiet: true });

const {
  connectDatabase,
  mongoose,
  User,
  Counter,
  getNextUserId,
} = require("./server");

const sampleUsers = [
  { first_name: "Иван", last_name: "Иванов", age: 20 },
  { first_name: "Мария", last_name: "Петрова", age: 22 },
  { first_name: "Алексей", last_name: "Сидоров", age: 19 },
];

function getUnixTimestamp() {
  return Math.floor(Date.now() / 1000);
}

async function seed() {
  await connectDatabase();
  await User.deleteMany({});
  await Counter.deleteOne({ name: "users" });

  for (const sampleUser of sampleUsers) {
    const timestamp = getUnixTimestamp();
    await User.create({
      id: await getNextUserId(),
      ...sampleUser,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }

  const users = await User.find().sort({ id: 1 });
  console.log(`Seeded ${users.length} users.`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

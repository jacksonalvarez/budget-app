import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Transaction, IncomeSource, RecurringExpense, SavingsGoal, Category } from '../types';
import { defaultCategories } from '../utils/categories';

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface UserData {
  transactions: Transaction[];
  incomeSources: IncomeSource[];
  recurringExpenses: RecurringExpense[];
  savingsGoals: SavingsGoal[];
  categories: Category[];
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

// Helper function to get S3 key for user data
const getUserDataKey = (userId: string): string => {
  return `users/${userId}/budget-data.json`;
};

// Save user data to S3
export async function saveUserDataToS3(userId: string, userData: UserData): Promise<void> {
  try {
    const key = getUserDataKey(userId);
    const body = JSON.stringify(userData, null, 2);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: 'application/json',
    });

    await s3Client.send(command);
    console.log(`User data saved successfully for user ${userId}`);
  } catch (error: any) {
    console.error('Error saving user data to S3:', error);
    
    if (error?.name === 'AccessDenied') {
      throw new Error(`AWS Access Denied: Check your IAM permissions for bucket ${BUCKET_NAME}`);
    } else if (error?.name === 'NoSuchBucket') {
      throw new Error(`S3 Bucket not found: ${BUCKET_NAME}`);
    } else if (error?.name === 'CredentialsProviderError') {
      throw new Error('AWS Credentials not configured properly');
    }
    
    throw new Error(`S3 Save Error: ${error?.message || 'Unknown S3 error'}`);
  }
}

// Load user data from S3
export async function loadUserDataFromS3(userId: string): Promise<UserData | null> {
  try {
    const key = getUserDataKey(userId);

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (response.Body) {
      const bodyString = await response.Body.transformToString();
      const userData = JSON.parse(bodyString) as UserData;
      
      // Migrate existing data to include categories if they don't exist
      if (!userData.categories) {
        userData.categories = defaultCategories;
        console.log('Migrating user data to include default categories');
        // Save the migrated data back to S3
        await saveUserDataToS3(userId, userData);
      }
      
      console.log(`User data loaded successfully for user ${userId}`);
      return userData;
    }
    
    return null;
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      console.log(`No existing data found for user ${userId}, returning default data`);
      return {
        transactions: [],
        incomeSources: [],
        recurringExpenses: [],
        savingsGoals: [],
        categories: defaultCategories,
      };
    }
    
    console.error('Error loading user data from S3:', error);
    
    // Check for specific AWS errors
    if (error.name === 'AccessDenied') {
      throw new Error(`AWS Access Denied: Check your IAM permissions for bucket ${BUCKET_NAME}`);
    } else if (error.name === 'NoSuchBucket') {
      throw new Error(`S3 Bucket not found: ${BUCKET_NAME}`);
    } else if (error.name === 'CredentialsProviderError') {
      throw new Error('AWS Credentials not configured properly');
    } else if (error.name === 'NoSuchKey') {
      // This is normal for new users, return default data instead of throwing
      console.log('No existing data found for user, returning default data');
      return {
        transactions: [],
        incomeSources: [],
        recurringExpenses: [],
        savingsGoals: [],
        categories: defaultCategories,
      };
    }
    
    throw new Error(`S3 Error: ${error.message || 'Unknown S3 error'}`);
  }
}

// Initialize default user data if none exists
export async function initializeUserData(userId: string): Promise<UserData> {
  const existingData = await loadUserDataFromS3(userId);
  
  if (existingData) {
    return existingData;
  }

  const defaultData: UserData = {
    transactions: [],
    incomeSources: [],
    recurringExpenses: [],
    savingsGoals: [],
    categories: defaultCategories,
  };

  await saveUserDataToS3(userId, defaultData);
  return defaultData;
}
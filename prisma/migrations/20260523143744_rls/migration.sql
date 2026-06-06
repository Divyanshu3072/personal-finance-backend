-- Enable Row Level Security

-- Enable Row Level Security
ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

-- Force Row Level Security (applies to table owners)
ALTER TABLE "BankAccount" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Category" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" FORCE ROW LEVEL SECURITY;

-- Create Policies for BankAccount
CREATE POLICY "BankAccount_rls_policy" ON "BankAccount"
  FOR ALL
  USING ("userId"::text = current_setting('app.current_user_id', true));

-- Create Policies for Category
CREATE POLICY "Category_rls_policy" ON "Category"
  FOR ALL
  USING ("userId"::text = current_setting('app.current_user_id', true));

-- Create Policies for Transaction
CREATE POLICY "Transaction_rls_policy" ON "Transaction"
  FOR ALL
  USING ("userId"::text = current_setting('app.current_user_id', true));
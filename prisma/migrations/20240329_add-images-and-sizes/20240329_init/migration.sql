CREATE TABLE "Product" (
  "id" SERIAL PRIMARY KEY,
  "price" INTEGER NOT NULL,
  "isTop" BOOLEAN NOT NULL,
  "sku" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "images" JSONB NOT NULL DEFAULT '[]',
  "sizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

CREATE TABLE "CartItem" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "productId" INTEGER NOT NULL,
  "color" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "fk_product" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

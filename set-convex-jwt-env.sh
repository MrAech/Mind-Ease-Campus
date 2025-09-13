# Generate keypair and capture output
$npxOut = npx jwt-keygen
$npxOut | Out-File -Encoding utf8 jwt_output.txt

# Split output into lines
$lines = (Get-Content -Raw jwt_output.txt -Encoding UTF8) -split "`n"

# First line = PEM
$pem = $lines[0]

# Second line = JWKS
$jwks = $lines[1]

# Save PEM in a file
$pem | Out-File -Encoding ascii jwt_private.pem

# Load PEM
$val = Get-Content -Raw .\jwt_private.pem

# Convert PEM to Base64 (single safe line)
$base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($val))


# npx convex dev

# Set environment variables safely
npx convex env set JWT_PRIVATE_KEY_BASE64 -- $base64

npx convex env set JWT_PRIVATE_KEY "$val"
npx convex env set JWKS -- "$jwks"
npx convex env set SITE_URL -- "http://localhost:5174"

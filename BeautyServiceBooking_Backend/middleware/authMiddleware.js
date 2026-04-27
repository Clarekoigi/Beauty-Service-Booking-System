const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    // 1. Get the token from the header (Format: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        // 2. Verify the token using your secret key
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Attach the user data to the 'req' object
        // This is where req.user.id comes from!
        req.user = verified; 
        
        // 4. Move to the next function (the Controller)
        next(); 
    } catch (err) {
        res.status(403).json({ message: "Invalid or Expired Token" });
    }
};
router.post('/add', verifyToken, async (req, res) => {
    const { booking_id, comment, rating } = req.body;
    await db.execute(
        "INSERT INTO reviews (booking_id, customer_id, comment, rating) VALUES (?, ?, ?, ?)",
        [booking_id, req.user.id, comment, rating || 5]
    );
    res.json({ message: "Review shared with stylist!" });
});
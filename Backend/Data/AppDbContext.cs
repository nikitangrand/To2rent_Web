using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Property> Properties => Set<Property>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Inquiry> Inquiries => Set<Inquiry>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<Property>().ToTable("Properties");
        modelBuilder.Entity<Booking>().ToTable("Bookings");
        modelBuilder.Entity<Review>().ToTable("Reviews");
        modelBuilder.Entity<Inquiry>().ToTable("Inquiries");
        modelBuilder.Entity<User>().ToTable("Users");
    }
}

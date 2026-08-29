var builder = WebApplication.CreateBuilder(args);

// 1. Register CORS policy before builder.Build()
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Game Engine implementation
builder.Services.AddSingleton<TicTacToe.Api.Services.IGameEngine, TicTacToe.Api.Services.GameEngine>();

var app = builder.Build();

// Enable Swagger UI unconditionally for local development
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "TicTacToe API V1");
    c.RoutePrefix = "swagger"; // Serves UI at http://localhost:5000/swagger
});

// 2. Enable CORS middleware
app.UseCors("AllowAngular");

app.UseAuthorization();
app.MapControllers();

app.Run();
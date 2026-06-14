using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Monitor.Server.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ServerConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ServerIp = table.Column<string>(type: "TEXT", nullable: false),
                    CustomName = table.Column<string>(type: "TEXT", nullable: false),
                    ServiceName = table.Column<string>(type: "TEXT", nullable: false),
                    Certificates = table.Column<string>(type: "TEXT", nullable: false),
                    TrackCpu = table.Column<bool>(type: "INTEGER", nullable: false),
                    TrackRam = table.Column<bool>(type: "INTEGER", nullable: false),
                    TrackDisk = table.Column<bool>(type: "INTEGER", nullable: false),
                    TrackNet = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServerConfigs", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ServerConfigs");
        }
    }
}

using System;
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
                    CertificatePath = table.Column<string>(type: "TEXT", nullable: true),
                    ServiceName = table.Column<string>(type: "TEXT", nullable: true),
                    TrackRam = table.Column<bool>(type: "INTEGER", nullable: false),
                    TrackCpu = table.Column<bool>(type: "INTEGER", nullable: false),
                    TrackDisk = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
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

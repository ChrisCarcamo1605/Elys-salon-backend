import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameRoleEmpleadaToEmpleado1779200000000 implements MigrationInterface {
    name = 'RenameRoleEmpleadaToEmpleado1779200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename enum value 'empleada' → 'empleado' in users table
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME VALUE 'empleada' TO 'empleado'`);

        // Rename column 'empleada' → 'empleado' in permissions_matrix
        await queryRunner.query(`ALTER TABLE "permissions_matrix" RENAME COLUMN "empleada" TO "empleado"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "permissions_matrix" RENAME COLUMN "empleado" TO "empleada"`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME VALUE 'empleado' TO 'empleada'`);
    }
}

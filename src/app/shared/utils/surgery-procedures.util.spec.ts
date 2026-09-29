import { officialProceduresFromRecord, sameProcedureSelection } from './surgery-procedures.util';

describe('surgery-procedures.util', () => {
  const record = {
    surgeries: [
      { id: 11, procedures: [{ id: '100', description: 'Colecistectomia', isPrimary: true }] },
      {
        id: 10,
        procedures: [
          { id: '200', description: 'Herniorrafia inguinal', isPrimary: false },
          { id: '300', description: 'Laparotomia exploradora', isPrimary: true },
        ],
      },
    ],
  };

  it('usa apenas os procedimentos da cirurgia informada, com o principal primeiro', () => {
    const result = officialProceduresFromRecord(record, 10);

    expect(result.map((p) => p.procedureId)).toEqual(['300', '200']);
    expect(result[0]).toEqual({ procedureId: '300', name: 'Laparotomia exploradora', isPrimary: true });
  });

  it('marca o primeiro como principal quando nenhum vier marcado', () => {
    const result = officialProceduresFromRecord({ surgeries: [{ id: 5, procedures: [{ id: '1', description: 'X' }] }] }, 5);

    expect(result[0].isPrimary).toBeTrue();
  });

  it('retorna lista vazia sem cirurgias', () => {
    expect(officialProceduresFromRecord(null, 10)).toEqual([]);
  });

  it('compara seleção por conjunto de ids e procedimento principal', () => {
    expect(sameProcedureSelection(
      [{ procedureId: '1', isPrimary: true }, { procedureId: '2' }],
      [{ procedureId: '2', isPrimary: false }, { procedureId: '1', isPrimary: true }],
    )).toBeTrue();

    expect(sameProcedureSelection([{ procedureId: '1', isPrimary: true }], [{ procedureId: '2', isPrimary: true }])).toBeFalse();
    expect(sameProcedureSelection(
      [{ procedureId: '1', isPrimary: false }, { procedureId: '2', isPrimary: true }],
      [{ procedureId: '1', isPrimary: true }, { procedureId: '2', isPrimary: false }],
    )).toBeFalse();
  });
});
